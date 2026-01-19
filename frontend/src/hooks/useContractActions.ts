import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { vaultContract, tokenContract, CHAIN_ID } from "@/lib/contracts";
import { useCallback } from "react";
import { sepolia } from "wagmi/chains";

export function useApprove() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = useCallback((amount: bigint) => {
    if (!address) return;
    writeContract({
      ...tokenContract,
      functionName: "approve",
      args: [vaultContract.address, amount],
      chain: sepolia,
      account: address,
    });
  }, [writeContract, address]);

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useStake() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const stake = useCallback((amount: bigint, lockPeriod: bigint) => {
    if (!address) return;
    writeContract({
      ...vaultContract,
      functionName: "stake",
      args: [amount, lockPeriod],
      chain: sepolia,
      account: address,
    });
  }, [writeContract, address]);

  return {
    stake,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useClaimReward() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claimReward = useCallback((index: bigint) => {
    if (!address) return;
    writeContract({
      ...vaultContract,
      functionName: "claimReward",
      args: [index],
      chain: sepolia,
      account: address,
    });
  }, [writeContract, address]);

  return {
    claimReward,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useUnstake() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const unstake = useCallback((index: bigint) => {
    if (!address) return;
    writeContract({
      ...vaultContract,
      functionName: "unstake",
      args: [index],
      chain: sepolia,
      account: address,
    });
  }, [writeContract, address]);

  return {
    unstake,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
