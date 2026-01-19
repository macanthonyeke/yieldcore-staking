import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useState, useCallback, useEffect, useRef } from "react";
import { vaultContract, VAULT_ADDRESS } from "@/lib/contracts";
import { VAULT_ABI } from "@/lib/abis";
import type { Log } from "viem";

export type ActivityType = "stake" | "claim" | "unstake" | "early_unstake" | "emergency_withdraw";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  stakeIndex: number;
  amount: string; // Store as string for consistency
  timestamp: number; // Block timestamp in ms
  txHash: `0x${string}`;
  penalty?: string;
}

const MAX_ENTRIES = 50;

/**
 * Creates a unique ID for an activity entry based on txHash and log index.
 * This ensures deduplication across historical and live events.
 */
function createActivityId(txHash: `0x${string}`, logIndex: number): string {
  return `${txHash}-${logIndex}`;
}

/**
 * ARCHITECTURE: Activity log is derived EXCLUSIVELY from on-chain events.
 * - Queries historical events on mount/address change
 * - Watches for live events for real-time updates
 * - No localStorage persistence (blockchain IS the persistence layer)
 * - Deduplication by txHash + logIndex
 */
export function useActivityLog() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const processedTxs = useRef<Set<string>>(new Set());
  const currentAddress = useRef<string | undefined>(undefined);

  // Add a single activity, with deduplication
  const addActivity = useCallback((entry: ActivityEntry) => {
    if (processedTxs.current.has(entry.id)) {
      return;
    }
    processedTxs.current.add(entry.id);
    
    setActivities((prev) => {
      // Double-check for duplicates in state
      if (prev.some((a) => a.id === entry.id)) {
        return prev;
      }
      // Add new entry and sort by timestamp (newest first)
      const updated = [...prev, entry]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_ENTRIES);
      return updated;
    });
  }, []);

  // Fetch historical events from the blockchain
  const fetchHistoricalEvents = useCallback(async () => {
    if (!publicClient || !address) return;

    setIsLoading(true);
    processedTxs.current.clear();
    setActivities([]);

    try {
      // Fetch all event types in parallel
      const [stakedLogs, claimedLogs, unstakeLogs, earlyUnstakeLogs, emergencyLogs] = await Promise.all([
        publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: {
            type: "event",
            name: "Staked",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "stakeIndex", indexed: false },
              { type: "uint256", name: "amount", indexed: false },
              { type: "uint256", name: "lockPeriod", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: "earliest",
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: {
            type: "event",
            name: "ClaimedReward",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "stakeIndex", indexed: false },
              { type: "uint256", name: "reward", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: "earliest",
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: {
            type: "event",
            name: "UnstakeAfterLock",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "stakeIndex", indexed: false },
              { type: "uint256", name: "principal", indexed: false },
              { type: "uint256", name: "reward", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: "earliest",
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: {
            type: "event",
            name: "EarlyUnstake",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "stakeIndex", indexed: false },
              { type: "uint256", name: "principal", indexed: false },
              { type: "uint256", name: "penalty", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: "earliest",
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: {
            type: "event",
            name: "EmergencyWithdrawal",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "stakeIndex", indexed: false },
              { type: "uint256", name: "principal", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: "earliest",
          toBlock: "latest",
        }),
      ]);

      // Get block timestamps for all unique blocks
      const allLogs = [...stakedLogs, ...claimedLogs, ...unstakeLogs, ...earlyUnstakeLogs, ...emergencyLogs];
      const blockNumbers = [...new Set(allLogs.map((log) => log.blockNumber))];
      
      const blockTimestamps = new Map<bigint, number>();
      await Promise.all(
        blockNumbers.map(async (blockNumber) => {
          if (blockNumber) {
            const block = await publicClient.getBlock({ blockNumber });
            blockTimestamps.set(blockNumber, Number(block.timestamp) * 1000);
          }
        })
      );

      const entries: ActivityEntry[] = [];

      // Process Staked events
      stakedLogs.forEach((log) => {
        if (!log.transactionHash || log.logIndex === undefined) return;
        const timestamp = log.blockNumber ? blockTimestamps.get(log.blockNumber) ?? Date.now() : Date.now();
        entries.push({
          id: createActivityId(log.transactionHash, log.logIndex),
          type: "stake",
          stakeIndex: Number(log.args.stakeIndex ?? 0),
          amount: (log.args.amount ?? 0n).toString(),
          timestamp,
          txHash: log.transactionHash,
        });
      });

      // Process ClaimedReward events
      claimedLogs.forEach((log) => {
        if (!log.transactionHash || log.logIndex === undefined) return;
        const timestamp = log.blockNumber ? blockTimestamps.get(log.blockNumber) ?? Date.now() : Date.now();
        entries.push({
          id: createActivityId(log.transactionHash, log.logIndex),
          type: "claim",
          stakeIndex: Number(log.args.stakeIndex ?? 0),
          amount: (log.args.reward ?? 0n).toString(),
          timestamp,
          txHash: log.transactionHash,
        });
      });

      // Process UnstakeAfterLock events
      unstakeLogs.forEach((log) => {
        if (!log.transactionHash || log.logIndex === undefined) return;
        const timestamp = log.blockNumber ? blockTimestamps.get(log.blockNumber) ?? Date.now() : Date.now();
        entries.push({
          id: createActivityId(log.transactionHash, log.logIndex),
          type: "unstake",
          stakeIndex: Number(log.args.stakeIndex ?? 0),
          amount: (log.args.principal ?? 0n).toString(),
          timestamp,
          txHash: log.transactionHash,
        });
      });

      // Process EarlyUnstake events
      earlyUnstakeLogs.forEach((log) => {
        if (!log.transactionHash || log.logIndex === undefined) return;
        const timestamp = log.blockNumber ? blockTimestamps.get(log.blockNumber) ?? Date.now() : Date.now();
        entries.push({
          id: createActivityId(log.transactionHash, log.logIndex),
          type: "early_unstake",
          stakeIndex: Number(log.args.stakeIndex ?? 0),
          amount: (log.args.principal ?? 0n).toString(),
          timestamp,
          txHash: log.transactionHash,
          penalty: log.args.penalty?.toString(),
        });
      });

      // Process EmergencyWithdrawal events
      emergencyLogs.forEach((log) => {
        if (!log.transactionHash || log.logIndex === undefined) return;
        const timestamp = log.blockNumber ? blockTimestamps.get(log.blockNumber) ?? Date.now() : Date.now();
        entries.push({
          id: createActivityId(log.transactionHash, log.logIndex),
          type: "emergency_withdraw",
          stakeIndex: Number(log.args.stakeIndex ?? 0),
          amount: (log.args.principal ?? 0n).toString(),
          timestamp,
          txHash: log.transactionHash,
        });
      });

      // Mark all as processed and update state
      entries.forEach((e) => processedTxs.current.add(e.id));
      
      // Sort by timestamp (newest first) and limit
      const sorted = entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_ENTRIES);
      setActivities(sorted);
    } catch (error) {
      console.error("Failed to fetch historical activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  // Fetch historical events on mount and when address changes
  useEffect(() => {
    const normalizedAddress = address?.toLowerCase();
    const normalizedCurrent = currentAddress.current?.toLowerCase();

    if (normalizedAddress !== normalizedCurrent) {
      currentAddress.current = address;
      
      if (isConnected && address && publicClient) {
        fetchHistoricalEvents();
      } else {
        setActivities([]);
        processedTxs.current.clear();
      }
    }
  }, [address, isConnected, publicClient, fetchHistoricalEvents]);

  // Helper to process live event logs
  const processLiveEvent = useCallback(
    async (
      log: Log,
      type: ActivityType,
      stakeIndex: bigint | undefined,
      amount: bigint | undefined,
      penalty?: bigint
    ) => {
      if (!log.transactionHash || log.logIndex === undefined || !publicClient) return;

      const id = createActivityId(log.transactionHash, log.logIndex);
      if (processedTxs.current.has(id)) return;

      // Get block timestamp
      let timestamp = Date.now();
      if (log.blockNumber) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          timestamp = Number(block.timestamp) * 1000;
        } catch {
          // Fall back to current time if block fetch fails
        }
      }

      addActivity({
        id,
        type,
        stakeIndex: Number(stakeIndex ?? 0),
        amount: (amount ?? 0n).toString(),
        timestamp,
        txHash: log.transactionHash,
        penalty: penalty?.toString(),
      });
    },
    [publicClient, addActivity]
  );

  // Watch for live Staked events
  useWatchContractEvent({
    ...vaultContract,
    eventName: "Staked",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
          processLiveEvent(log, "stake", log.args.stakeIndex, log.args.amount);
        }
      });
    },
    enabled: isConnected && !!address,
  });

  // Watch for live ClaimedReward events
  useWatchContractEvent({
    ...vaultContract,
    eventName: "ClaimedReward",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
          processLiveEvent(log, "claim", log.args.stakeIndex, log.args.reward);
        }
      });
    },
    enabled: isConnected && !!address,
  });

  // Watch for live UnstakeAfterLock events
  useWatchContractEvent({
    ...vaultContract,
    eventName: "UnstakeAfterLock",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
          processLiveEvent(log, "unstake", log.args.stakeIndex, log.args.principal);
        }
      });
    },
    enabled: isConnected && !!address,
  });

  // Watch for live EarlyUnstake events
  useWatchContractEvent({
    ...vaultContract,
    eventName: "EarlyUnstake",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
          processLiveEvent(log, "early_unstake", log.args.stakeIndex, log.args.principal, log.args.penalty);
        }
      });
    },
    enabled: isConnected && !!address,
  });

  // Watch for live EmergencyWithdrawal events
  useWatchContractEvent({
    ...vaultContract,
    eventName: "EmergencyWithdrawal",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
          processLiveEvent(log, "emergency_withdraw", log.args.stakeIndex, log.args.principal);
        }
      });
    },
    enabled: isConnected && !!address,
  });

  return {
    activities,
    hasActivities: activities.length > 0,
    isLoading,
    refetch: fetchHistoricalEvents,
  };
}

/**
 * Formats an activity type for display.
 */
export function formatActivityType(type: ActivityType): string {
  switch (type) {
    case "stake":
      return "Stake created";
    case "claim":
      return "Rewards claimed";
    case "unstake":
      return "Unstake completed";
    case "early_unstake":
      return "Early unstake completed";
    case "emergency_withdraw":
      return "Emergency withdrawal";
    default:
      return "Action completed";
  }
}
