import { useAccount, useReadContract, useReadContracts, useChainId } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";
import { vaultContract } from "@/lib/contracts";
import { useMemo, useEffect, useContext, useRef, useCallback } from "react";
import { SyncStateContext } from "@/hooks/useSyncState";

export interface StakeData {
  index: number; // On-chain index for transactions
  displayNumber: number; // Sequential display number (1-based)
  amount: bigint;
  startTime: bigint;
  lockPeriod: bigint;
  fixedRate: bigint;
  rewardsClaimed: bigint;
  active: boolean;
  expired: boolean;
}

/**
 * ARCHITECTURE: Stakes are derived PURELY from on-chain reads.
 * - Never store stake data in mutable React state
 * - Never clear/reset stake arrays on write success
 * - Stake cards render ONLY from contract read results
 * - During refetch: keep last-known data visible (no empty flashes)
 * - Errors are surfaced to UI, not masked
 * 
 * STRICT READ GATING:
 * - Reads are DISABLED until: wallet connected + address defined + network is Sepolia
 * - Empty state is ONLY shown when reads complete successfully with zero stakes
 */
export function useStakingData() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const syncState = useContext(SyncStateContext);
  const queryClient = useQueryClient();
  
  // Track successful data load per address to distinguish initial load vs refetch
  const loadedAddresses = useRef<Set<string>>(new Set());
  
  // CRITICAL: Store last valid stakes to prevent empty flashes during refetch
  const lastValidStakes = useRef<StakeData[]>([]);
  const lastValidStakeCount = useRef<number>(0);

  // STRICT READ GATING: All conditions must be true before ANY contract read
  const isOnSepolia = chainId === sepolia.id;
  const isReady = isConnected && !!address && isOnSepolia;

  const { 
    data: stakeCount, 
    refetch: refetchCount, 
    isLoading: isCountLoading, 
    isFetching: isCountFetching,
    isSuccess: isCountSuccess,
    isError: isCountError,
    error: countError,
    dataUpdatedAt: countUpdatedAt,
  } = useReadContract({
    ...vaultContract,
    functionName: "getStakeCount",
    args: address ? [address] : undefined,
    query: {
      // CRITICAL: Reads are DISABLED until all gating conditions pass
      enabled: isReady,
      // Stale time 0 ensures fresh data on refetch after writes
      staleTime: 0,
      retry: 2,
    },
  });

  const { data: rewardPool, isLoading: isPoolLoading, isFetching: isPoolFetching } = useReadContract({
    ...vaultContract,
    functionName: "rewardPool",
  });

  const stakeIndices = useMemo(() => {
    if (!stakeCount) return [];
    return Array.from({ length: Number(stakeCount) }, (_, i) => BigInt(i));
  }, [stakeCount]);

  const { 
    data: stakesData, 
    refetch: refetchStakes, 
    isLoading: isStakesLoading, 
    isFetching: isStakesFetching,
    isSuccess: isStakesSuccess,
    isError: isStakesError,
    error: stakesError,
    dataUpdatedAt: stakesUpdatedAt,
  } = useReadContracts({
    contracts: stakeIndices.map((index) => ({
      ...vaultContract,
      functionName: "getStake" as const,
      args: [address!, index] as const,
    })),
    query: {
      // CRITICAL: Reads DISABLED until we have address AND count > 0
      enabled: isReady && stakeIndices.length > 0,
      // Stale time 0 ensures fresh data on refetch after writes
      staleTime: 0,
      retry: 2,
    },
  });

  // Combine error states
  const isError = isCountError || isStakesError;
  const error = countError || stakesError;

  // CRITICAL: Explicit data readiness check
  // Data is ONLY ready when:
  // 1. Count query succeeded AND either:
  //    a. Count is 0 (no stakes, nothing more to load)
  //    b. Count > 0 AND stakes query also succeeded
  const isDataReady = useMemo(() => {
    if (!isReady) return false;
    if (!isCountSuccess) return false;
    if (stakeCount === 0n) return true; // Zero stakes is a valid ready state
    if (stakeCount && stakeCount > 0n) {
      return isStakesSuccess;
    }
    return false;
  }, [isReady, isCountSuccess, stakeCount, isStakesSuccess]);

  // Register syncing state globally
  const isFetching = isCountFetching || isPoolFetching || isStakesFetching;
  
  useEffect(() => {
    if (!syncState) return;
    
    if (isFetching) {
      syncState.registerFetching("staking");
    } else {
      syncState.unregisterFetching("staking");
    }
    
    return () => {
      syncState.unregisterFetching("staking");
    };
  }, [isFetching, syncState]);

  // Derive stakes PURELY from contract read data
  // Include dataUpdatedAt in dependencies to force re-derivation after refetch
  const derivedStakes: StakeData[] = useMemo(() => {
    if (!stakesData) return [];
    
    const activeStakes = stakesData
      .map((result, index) => {
        if (result.status !== "success" || !result.result) return null;
        
        const [amount, startTime, lockPeriod, fixedRate, rewardsClaimed, active, expired] = result.result as [
          bigint, bigint, bigint, bigint, bigint, boolean, boolean
        ];
        
        if (!active) return null;
        
        return {
          index, // On-chain index
          displayNumber: 0, // Will be set below
          amount,
          startTime,
          lockPeriod,
          fixedRate,
          rewardsClaimed,
          active,
          expired,
        };
      })
      .filter((stake) => stake !== null) as StakeData[];
    
    // Assign sequential display numbers (1-based)
    return activeStakes.map((stake, i) => ({
      ...stake,
      displayNumber: i + 1,
    }));
  }, [stakesData, stakesUpdatedAt]);

  // Track when we have valid data for current address
  const hasLoadedForCurrentAddress = address ? loadedAddresses.current.has(address.toLowerCase()) : false;

  // Update cache when we get valid data
  useEffect(() => {
    if (address && isCountSuccess && (stakeCount === 0n || (stakeCount && isStakesSuccess))) {
      loadedAddresses.current.add(address.toLowerCase());
      // Store valid stake data
      if (derivedStakes.length > 0 || stakeCount === 0n) {
        lastValidStakes.current = derivedStakes;
        lastValidStakeCount.current = stakeCount ? Number(stakeCount) : 0;
      }
    }
  }, [address, isCountSuccess, isStakesSuccess, derivedStakes, stakeCount]);

  // Clear cache on address change
  useEffect(() => {
    if (address) {
      const addrLower = address.toLowerCase();
      if (!loadedAddresses.current.has(addrLower)) {
        // New address - clear last valid data
        lastValidStakes.current = [];
        lastValidStakeCount.current = 0;
      }
    }
  }, [address]);

  // CRITICAL: Use last valid stakes during refetch to prevent empty flash
  // Only show empty/loading when we've never loaded data for this address
  const stakes = useMemo(() => {
    // If we have derived stakes, use them
    if (derivedStakes.length > 0) {
      return derivedStakes;
    }
    // If count is 0 and we've confirmed it, return empty
    if (isCountSuccess && stakeCount === 0n) {
      return [];
    }
    // During refetch or loading, return last valid stakes
    if (lastValidStakes.current.length > 0) {
      return lastValidStakes.current;
    }
    return derivedStakes;
  }, [derivedStakes, isCountSuccess, stakeCount]);

  // CRITICAL: Determine if we should show empty state
  // Empty state is ONLY valid when:
  // 1. Reads are enabled (isReady)
  // 2. Count query completed successfully
  // 3. Count is confirmed to be 0
  const isConfirmedEmpty = isDataReady && stakeCount === 0n;

  // Determine loading state:
  // - Show loading when reads are enabled but data is not ready yet
  // - NEVER show loading during refetches (keep existing data visible)
  const isInitialLoad = isReady && !hasLoadedForCurrentAddress && !isDataReady && !isError;

  // Memoized refetch function - invalidates cache and awaits fresh data
  const refetch = useCallback(async () => {
    // Invalidate all wagmi contract read queries to bust cache
    await queryClient.invalidateQueries({ queryKey: ['readContract'] });
    await queryClient.invalidateQueries({ queryKey: ['readContracts'] });
    
    // Refetch and wait for results
    const [countResult, stakesResult] = await Promise.all([
      refetchCount(),
      refetchStakes(),
    ]);
    
    return { countResult, stakesResult };
  }, [refetchCount, refetchStakes, queryClient]);

  return {
    stakes,
    stakeCount: stakeCount !== undefined ? Number(stakeCount) : lastValidStakeCount.current,
    rewardPool: rewardPool ?? 0n,
    // Loading = ONLY on initial load when data not ready, not refetches
    isLoading: isInitialLoad,
    isFetching,
    isReady,
    // CRITICAL: Explicit flag for confirmed empty state
    isConfirmedEmpty,
    // Data ready = reads completed successfully
    isDataReady,
    // Error state for UI handling
    isError,
    error,
    refetch,
  };
}
