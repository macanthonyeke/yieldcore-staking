import { useAccount, useReadContract } from "wagmi";
import { tokenContract, vaultContract } from "@/lib/contracts";
import { useEffect, useContext } from "react";
import { SyncStateContext } from "@/hooks/useSyncState";

/**
 * Hardcoded token display constants.
 * These are used for UI display purposes only - not derived from contract reads.
 */
export const TOKEN_DISPLAY_SYMBOL = "$YLD";
export const TOKEN_DISPLAY_NAME = "YieldCore Token";
export const TOKEN_DECIMALS = 18;

export function useTokenData() {
  const { address } = useAccount();
  const syncState = useContext(SyncStateContext);

  const { data: balanceData, refetch: refetchBalance, isLoading: isBalanceLoading, isFetching: isBalanceFetching } = useReadContract({
    ...tokenContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: allowanceData, refetch: refetchAllowance, isLoading: isAllowanceLoading, isFetching: isAllowanceFetching } = useReadContract({
    ...tokenContract,
    functionName: "allowance",
    args: address ? [address, vaultContract.address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Register syncing state globally
  const isFetching = isBalanceFetching || isAllowanceFetching;
  
  useEffect(() => {
    if (!syncState) return;
    
    if (isFetching) {
      syncState.registerFetching("token");
    } else {
      syncState.unregisterFetching("token");
    }
    
    return () => {
      syncState.unregisterFetching("token");
    };
  }, [isFetching, syncState]);

  return {
    balance: balanceData ?? 0n,
    allowance: allowanceData ?? 0n,
    // Hardcoded display values - no contract reads needed
    symbol: TOKEN_DISPLAY_SYMBOL,
    decimals: TOKEN_DECIMALS,
    name: TOKEN_DISPLAY_NAME,
    isLoading: isBalanceLoading || isAllowanceLoading,
    isFetching,
    refetchBalance,
    refetchAllowance,
    refetch: () => {
      refetchBalance();
      refetchAllowance();
    },
  };
}
