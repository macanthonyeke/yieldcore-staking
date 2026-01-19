/**
 * Activity Log Persistence & Correctness Tests
 *
 * These tests validate that the Activity Log is:
 * - Sourced exclusively from on-chain events
 * - Persistent across page reloads
 * - Persistent across wallet reconnects
 * - Never dependent on transient UI state
 *
 * CRITICAL: If removing chain event queries does not break these tests,
 * the tests themselves are invalid.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
// Mock wagmi hooks before importing the hook under test
const mockGetLogs = vi.fn();
const mockGetBlock = vi.fn();
const mockWatchContractEvent = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  usePublicClient: vi.fn(),
  useWatchContractEvent: vi.fn(),
}));

vi.mock("@/lib/contracts", () => ({
  vaultContract: {
    address: "0x1234567890123456789012345678901234567890" as const,
    abi: [],
  },
  VAULT_ADDRESS: "0x1234567890123456789012345678901234567890" as const,
}));

import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useActivityLog, ActivityEntry, ActivityType } from "@/hooks/useActivityLog";

// Test wallet address
const TEST_ADDRESS = "0xTestUser1234567890123456789012345678901234" as `0x${string}`;
const TEST_ADDRESS_LOWER = TEST_ADDRESS.toLowerCase();

// Mock block data
const MOCK_BLOCK_TIMESTAMP = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago

// Helper to create mock log entries
function createMockLog(
  eventName: string,
  args: Record<string, unknown>,
  txHash: `0x${string}`,
  logIndex: number,
  blockNumber: bigint = 1000n
) {
  return {
    address: "0x1234567890123456789012345678901234567890" as const,
    blockHash: "0xblockhash" as `0x${string}`,
    blockNumber,
    transactionHash: txHash,
    transactionIndex: 0,
    logIndex,
    removed: false,
    args,
    eventName,
  };
}

// Mock historical events
function createMockStakedLog(
  stakeIndex: bigint,
  amount: bigint,
  lockPeriod: bigint,
  txHash: `0x${string}`,
  logIndex: number
) {
  return createMockLog(
    "Staked",
    { user: TEST_ADDRESS, stakeIndex, amount, lockPeriod },
    txHash,
    logIndex
  );
}

function createMockClaimedLog(
  stakeIndex: bigint,
  reward: bigint,
  txHash: `0x${string}`,
  logIndex: number
) {
  return createMockLog(
    "ClaimedReward",
    { user: TEST_ADDRESS, stakeIndex, reward },
    txHash,
    logIndex
  );
}

function createMockUnstakeLog(
  stakeIndex: bigint,
  principal: bigint,
  reward: bigint,
  txHash: `0x${string}`,
  logIndex: number
) {
  return createMockLog(
    "UnstakeAfterLock",
    { user: TEST_ADDRESS, stakeIndex, principal, reward },
    txHash,
    logIndex
  );
}

function createMockEarlyUnstakeLog(
  stakeIndex: bigint,
  principal: bigint,
  penalty: bigint,
  txHash: `0x${string}`,
  logIndex: number
) {
  return createMockLog(
    "EarlyUnstake",
    { user: TEST_ADDRESS, stakeIndex, principal, penalty },
    txHash,
    logIndex
  );
}

function createMockEmergencyLog(
  stakeIndex: bigint,
  principal: bigint,
  txHash: `0x${string}`,
  logIndex: number
) {
  return createMockLog(
    "EmergencyWithdrawal",
    { user: TEST_ADDRESS, stakeIndex, principal },
    txHash,
    logIndex
  );
}

describe("useActivityLog - Chain-Derived Persistence", () => {
  let mockPublicClient: {
    getLogs: Mock;
    getBlock: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPublicClient = {
      getLogs: mockGetLogs,
      getBlock: mockGetBlock,
    };

    // Default mock implementations
    mockGetLogs.mockResolvedValue([]);
    mockGetBlock.mockResolvedValue({ timestamp: MOCK_BLOCK_TIMESTAMP });

    (usePublicClient as Mock).mockReturnValue(mockPublicClient);
    (useWatchContractEvent as Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Page Reload Persistence (Most Important)
   *
   * This test validates that:
   * - Activity Log entries are fetched from blockchain on mount
   * - Historical entries persist after simulated "reload"
   * - Data matches the original on-chain events
   */
  describe("Test 1: Page Reload Persistence", () => {
    it("should fetch historical events on initial mount (simulating page load)", async () => {
      // Setup: Mock connected wallet
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      // Setup: Mock historical stake event from blockchain
      const mockStakeLog = createMockStakedLog(
        0n,
        1000000000000000000n, // 1 token
        30n * 24n * 60n * 60n, // 30 days
        "0xabc123" as `0x${string}`,
        0
      );

      mockGetLogs
        .mockResolvedValueOnce([mockStakeLog]) // Staked events
        .mockResolvedValueOnce([]) // ClaimedReward events
        .mockResolvedValueOnce([]) // UnstakeAfterLock events
        .mockResolvedValueOnce([]) // EarlyUnstake events
        .mockResolvedValueOnce([]); // EmergencyWithdrawal events

      // Act: Render hook (simulates page load)
      const { result } = renderHook(() => useActivityLog());

      // Assert: Verify getLogs was called (chain is queried)
      await waitFor(() => {
        expect(mockGetLogs).toHaveBeenCalled();
      });

      // Assert: Activity entry appears from chain data
      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      const entry = result.current.activities[0];
      expect(entry.type).toBe("stake");
      expect(entry.amount).toBe("1000000000000000000");
      expect(entry.txHash).toBe("0xabc123");
      expect(entry.stakeIndex).toBe(0);
    });

    it("should reconstruct activity log from chain on simulated reload", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      // Mock historical events that would exist on chain
      const mockStakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake1" as `0x${string}`, 0);
      const mockClaimLog = createMockClaimedLog(0n, 50n, "0xclaim1" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([mockStakeLog])
        .mockResolvedValueOnce([mockClaimLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // First render (initial load)
      const { result, unmount } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(2);
      });

      // Unmount to simulate page unload
      unmount();

      // Setup fresh mocks for "reload"
      mockGetLogs.mockClear();
      mockGetLogs
        .mockResolvedValueOnce([mockStakeLog])
        .mockResolvedValueOnce([mockClaimLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Re-render (simulates page reload)
      const { result: reloadedResult } = renderHook(() => useActivityLog());

      // CRITICAL: Chain must be queried again on reload
      await waitFor(() => {
        expect(mockGetLogs).toHaveBeenCalled();
      });

      // Data should be reconstructed from chain
      await waitFor(() => {
        expect(reloadedResult.current.activities.length).toBe(2);
      });

      // Verify data integrity matches chain
      const stakeEntry = reloadedResult.current.activities.find((a) => a.type === "stake");
      const claimEntry = reloadedResult.current.activities.find((a) => a.type === "claim");

      expect(stakeEntry).toBeDefined();
      expect(stakeEntry?.txHash).toBe("0xstake1");
      expect(claimEntry).toBeDefined();
      expect(claimEntry?.txHash).toBe("0xclaim1");
    });

    it("should NOT have empty state during rehydration when chain has data", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const mockStakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake1" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([mockStakeLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useActivityLog());

      // Loading state should be true initially
      expect(result.current.isLoading).toBe(true);

      // After loading, should have data
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.activities.length).toBe(1);
      });
    });
  });

  /**
   * TEST 2: Claim Action Logging
   *
   * Validates that claim rewards actions appear in Activity Log
   * with correct data from on-chain events.
   */
  describe("Test 2: Claim Action Logging", () => {
    it("should show claim entry from historical chain event", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const claimAmount = 500000000000000000n; // 0.5 tokens
      const mockClaimLog = createMockClaimedLog(0n, claimAmount, "0xclaim123" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([]) // Staked
        .mockResolvedValueOnce([mockClaimLog]) // ClaimedReward
        .mockResolvedValueOnce([]) // UnstakeAfterLock
        .mockResolvedValueOnce([]) // EarlyUnstake
        .mockResolvedValueOnce([]); // EmergencyWithdrawal

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      const claimEntry = result.current.activities[0];
      expect(claimEntry.type).toBe("claim");
      expect(claimEntry.amount).toBe(claimAmount.toString());
      expect(claimEntry.txHash).toBe("0xclaim123");
      expect(claimEntry.stakeIndex).toBe(0);
    });

    it("should persist claim entry after reload", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const mockClaimLog = createMockClaimedLog(0n, 100n, "0xclaim456" as `0x${string}`, 0);

      const setupMocks = () => {
        mockGetLogs
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([mockClaimLog])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
      };

      setupMocks();

      // Initial load
      const { result, unmount } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      unmount();

      // Reload
      mockGetLogs.mockClear();
      setupMocks();

      const { result: reloadedResult } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(reloadedResult.current.activities.length).toBe(1);
        expect(reloadedResult.current.activities[0].type).toBe("claim");
        expect(reloadedResult.current.activities[0].txHash).toBe("0xclaim456");
      });
    });
  });

  /**
   * TEST 3: Multi-Action Ordering
   *
   * Validates that multiple action types appear correctly,
   * sorted by timestamp (newest first), without duplicates.
   */
  describe("Test 3: Multi-Action Ordering", () => {
    it("should contain all action types sorted newest to oldest", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      // Create events with different block numbers to establish order
      const stakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake" as `0x${string}`, 0);
      stakeLog.blockNumber = 100n;

      const claimLog = createMockClaimedLog(0n, 50n, "0xclaim" as `0x${string}`, 0);
      claimLog.blockNumber = 200n;

      const unstakeLog = createMockUnstakeLog(0n, 1000n, 100n, "0xunstake" as `0x${string}`, 0);
      unstakeLog.blockNumber = 300n;

      // Mock getBlock to return different timestamps based on block number
      mockGetBlock.mockImplementation(({ blockNumber }) => {
        const timestamps: Record<string, bigint> = {
          "100": BigInt(1000),
          "200": BigInt(2000),
          "300": BigInt(3000),
        };
        return Promise.resolve({ timestamp: timestamps[blockNumber.toString()] || BigInt(0) });
      });

      mockGetLogs
        .mockResolvedValueOnce([stakeLog])
        .mockResolvedValueOnce([claimLog])
        .mockResolvedValueOnce([unstakeLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(3);
      });

      // Verify order: newest (unstake @ block 300) first
      expect(result.current.activities[0].type).toBe("unstake");
      expect(result.current.activities[1].type).toBe("claim");
      expect(result.current.activities[2].type).toBe("stake");
    });

    it("should not have duplicate entries", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      // Same event returned twice (edge case)
      const stakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([stakeLog, stakeLog]) // Duplicate in same response
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      // Only one entry despite duplicate logs
      expect(result.current.activities[0].txHash).toBe("0xstake");
    });

    it("should include all event types: stake, claim, unstake, early_unstake, emergency_withdraw", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const stakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake" as `0x${string}`, 0);
      const claimLog = createMockClaimedLog(0n, 50n, "0xclaim" as `0x${string}`, 0);
      const unstakeLog = createMockUnstakeLog(0n, 1000n, 100n, "0xunstake" as `0x${string}`, 0);
      const earlyUnstakeLog = createMockEarlyUnstakeLog(1n, 500n, 50n, "0xearly" as `0x${string}`, 0);
      const emergencyLog = createMockEmergencyLog(2n, 200n, "0xemergency" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([stakeLog])
        .mockResolvedValueOnce([claimLog])
        .mockResolvedValueOnce([unstakeLog])
        .mockResolvedValueOnce([earlyUnstakeLog])
        .mockResolvedValueOnce([emergencyLog]);

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(5);
      });

      const types = result.current.activities.map((a) => a.type);
      expect(types).toContain("stake");
      expect(types).toContain("claim");
      expect(types).toContain("unstake");
      expect(types).toContain("early_unstake");
      expect(types).toContain("emergency_withdraw");
    });
  });

  /**
   * TEST 4: Wallet Disconnect / Reconnect
   *
   * Validates that activity log rehydrates from chain
   * after wallet disconnect and reconnect.
   */
  describe("Test 4: Wallet Disconnect / Reconnect", () => {
    it("should clear activities on wallet disconnect", async () => {
      const mockUseAccount = useAccount as Mock;

      // Start connected
      mockUseAccount.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const stakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([stakeLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const { result, rerender } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      // Simulate disconnect
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.activities.length).toBe(0);
      });
    });

    it("should rehydrate activities from chain on wallet reconnect", async () => {
      const mockUseAccount = useAccount as Mock;

      // Start disconnected
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      const { result, rerender } = renderHook(() => useActivityLog());

      expect(result.current.activities.length).toBe(0);

      // Setup chain data for reconnect
      const stakeLog = createMockStakedLog(0n, 1000n, 2592000n, "0xstake" as `0x${string}`, 0);
      const claimLog = createMockClaimedLog(0n, 50n, "0xclaim" as `0x${string}`, 0);

      mockGetLogs.mockClear();
      mockGetLogs
        .mockResolvedValueOnce([stakeLog])
        .mockResolvedValueOnce([claimLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Simulate reconnect
      mockUseAccount.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      rerender();

      // CRITICAL: Chain must be queried on reconnect
      await waitFor(() => {
        expect(mockGetLogs).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.activities.length).toBe(2);
      });

      // Verify data came from chain
      const types = result.current.activities.map((a) => a.type);
      expect(types).toContain("stake");
      expect(types).toContain("claim");
    });

    it("should not show stale data from different wallet on reconnect", async () => {
      const mockUseAccount = useAccount as Mock;
      const OTHER_ADDRESS = "0xOtherUser12345678901234567890123456789012" as `0x${string}`;

      // Start with first wallet
      mockUseAccount.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const stakeLogWallet1 = createMockStakedLog(0n, 1000n, 2592000n, "0xwallet1stake" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([stakeLogWallet1])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const { result, rerender } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
        expect(result.current.activities[0].txHash).toBe("0xwallet1stake");
      });

      // Switch to different wallet
      mockGetLogs.mockClear();

      const stakeLogWallet2 = createMockStakedLog(0n, 500n, 2592000n, "0xwallet2stake" as `0x${string}`, 0);

      mockGetLogs
        .mockResolvedValueOnce([stakeLogWallet2])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockUseAccount.mockReturnValue({
        address: OTHER_ADDRESS,
        isConnected: true,
      });

      rerender();

      await waitFor(() => {
        // Should have wallet 2 data, not wallet 1
        expect(result.current.activities.length).toBe(1);
        expect(result.current.activities[0].txHash).toBe("0xwallet2stake");
      });
    });
  });

  /**
   * NEGATIVE TEST CONDITIONS
   *
   * These tests verify that the implementation REQUIRES chain queries.
   * If these pass without chain interaction, the implementation is wrong.
   */
  describe("Negative Tests: Chain Query Requirements", () => {
    it("should have no activities if chain returns no events", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      // Chain returns empty for all event types
      mockGetLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activities.length).toBe(0);
      expect(result.current.hasActivities).toBe(false);
    });

    it("should query chain on every mount (not cache locally)", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      mockGetLogs.mockResolvedValue([]);

      // First mount
      const { unmount } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(mockGetLogs).toHaveBeenCalled();
      });

      const callCountAfterFirstMount = mockGetLogs.mock.calls.length;
      unmount();

      // Second mount (simulates reload)
      renderHook(() => useActivityLog());

      await waitFor(() => {
        // Chain must be queried again
        expect(mockGetLogs.mock.calls.length).toBeGreaterThan(callCountAfterFirstMount);
      });
    });

    it("should call getLogs for all 5 event types", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      mockGetLogs.mockResolvedValue([]);

      renderHook(() => useActivityLog());

      await waitFor(() => {
        // Exactly 5 calls: Staked, ClaimedReward, UnstakeAfterLock, EarlyUnstake, EmergencyWithdrawal
        expect(mockGetLogs).toHaveBeenCalledTimes(5);
      });
    });

    it("should not query chain when wallet is disconnected", async () => {
      (useAccount as Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      mockGetLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useActivityLog());

      // Wait a tick to ensure no async calls happen
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockGetLogs).not.toHaveBeenCalled();
      expect(result.current.activities.length).toBe(0);
    });
  });

  /**
   * Data Integrity Tests
   *
   * Verify that activity entries contain all required fields
   * as specified in the data model.
   */
  describe("Data Model Integrity", () => {
    it("should include all required fields in activity entries", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const stakeLog = createMockStakedLog(
        5n, // stakeIndex
        2000000000000000000n, // 2 tokens
        7776000n, // 90 days
        "0xfulldata" as `0x${string}`,
        3 // logIndex
      );

      mockGetLogs
        .mockResolvedValueOnce([stakeLog])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      const entry = result.current.activities[0];

      // Verify all required fields exist
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("type");
      expect(entry).toHaveProperty("stakeIndex");
      expect(entry).toHaveProperty("amount");
      expect(entry).toHaveProperty("timestamp");
      expect(entry).toHaveProperty("txHash");

      // Verify data types
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.type).toBe("string");
      expect(typeof entry.stakeIndex).toBe("number");
      expect(typeof entry.amount).toBe("string");
      expect(typeof entry.timestamp).toBe("number");
      expect(typeof entry.txHash).toBe("string");

      // Verify values
      expect(entry.stakeIndex).toBe(5);
      expect(entry.amount).toBe("2000000000000000000");
      expect(entry.txHash).toBe("0xfulldata");
    });

    it("should include penalty field for early unstake", async () => {
      (useAccount as Mock).mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      });

      const earlyUnstakeLog = createMockEarlyUnstakeLog(
        0n,
        1000000000000000000n, // principal
        100000000000000000n, // 10% penalty
        "0xearlywithpenalty" as `0x${string}`,
        0
      );

      mockGetLogs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([earlyUnstakeLog])
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useActivityLog());

      await waitFor(() => {
        expect(result.current.activities.length).toBe(1);
      });

      const entry = result.current.activities[0];
      expect(entry.type).toBe("early_unstake");
      expect(entry.penalty).toBe("100000000000000000");
    });
  });
});
