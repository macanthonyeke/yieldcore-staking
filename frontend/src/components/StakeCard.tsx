import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTokenData } from "@/hooks/useTokenData";
import { useApprove, useStake } from "@/hooks/useContractActions";
import { LOCK_OPTIONS, LockOption, CHAIN_ID } from "@/lib/contracts";
import { parseTokenAmount, calculateMaxReward } from "@/lib/rewards";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TokenAmount } from "@/components/TokenAmount";
import { BalanceSkeleton } from "@/components/StakeSkeleton";
import { TransactionStatus } from "@/components/TransactionStatus";
import { GasHint } from "@/components/GasHint";
import { toast } from "sonner";
export function StakeCard({ onStakeSuccess }: { onStakeSuccess: () => void }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;
  const { balance, allowance, symbol, decimals, refetch, isLoading } = useTokenData();
  const [amount, setAmount] = useState("");
  const [selectedLock, setSelectedLock] = useState<LockOption>(LOCK_OPTIONS[0]);
  
  const approve = useApprove();
  const stake = useStake();

  const parsedAmount = useMemo(() => {
    try {
      return parseTokenAmount(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const needsApproval = parsedAmount > 0n && allowance < parsedAmount;
  const hasInsufficientBalance = parsedAmount > balance;
  const hasNoAmount = parsedAmount <= 0n;
  const canStake = !hasNoAmount && !hasInsufficientBalance && !needsApproval;

  const estimatedMaxReward = useMemo(() => {
    if (parsedAmount <= 0n) return 0n;
    return calculateMaxReward(parsedAmount, selectedLock.dailyRate);
  }, [parsedAmount, selectedLock.dailyRate]);

  // Reset on successful transactions with toasts
  // CRITICAL: Reset state immediately after confirmation to re-enable the form
  useEffect(() => {
    if (approve.isSuccess) {
      toast.success("Approval confirmed on-chain", {
        description: `${symbol} spending approved`,
      });
      refetch();
      // Reset immediately to allow next action
      approve.reset();
    }
  }, [approve.isSuccess, refetch, approve.reset, symbol]);

  useEffect(() => {
    if (stake.isSuccess) {
      toast.success("Stake confirmed on-chain", {
        description: `${amount} ${symbol} staked for ${selectedLock.label}`,
      });
      setAmount("");
      refetch();
      onStakeSuccess();
      // Reset immediately to allow next stake
      stake.reset();
    }
  }, [stake.isSuccess, refetch, stake.reset, onStakeSuccess, amount, symbol, selectedLock.label]);

  const handleApprove = () => {
    approve.approve(parsedAmount);
  };

  const handleStake = () => {
    stake.stake(parsedAmount, selectedLock.lockPeriod);
  };

  const handleMax = () => {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const displayDecimals = fractionalStr.slice(0, 4);
    setAmount(`${integerPart.toString()}.${displayDecimals}`);
  };

  // Smart button text based on state
  const getStakeButtonText = (): string => {
    if (stake.isPending) return "Confirm in Wallet...";
    if (stake.isConfirming) return "Confirming...";
    if (isWrongNetwork) return "Wrong Network";
    if (hasNoAmount) return "Enter Amount";
    if (hasInsufficientBalance) return "Insufficient Balance";
    return "Stake Tokens";
  };

  const getApproveButtonText = (): string => {
    if (approve.isPending) return "Confirm in Wallet...";
    if (approve.isConfirming) return "Confirming...";
    if (isWrongNetwork) return "Wrong Network";
    if (hasNoAmount) return "Enter Amount";
    return `Approve ${symbol}`;
  };

  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Stake Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Connect wallet to stake</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            Stake Tokens
            <InfoTooltip content="Lock your tokens for a selected period to earn rewards. Longer locks offer higher daily rates. Rewards accrue over time and cap at 24 hours of accrual." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Available Balance */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Label className="text-muted-foreground">Available Balance</Label>
              <InfoTooltip content="Your current token balance available for staking. This reflects on-chain state." />
            </div>
            {isLoading ? (
              <BalanceSkeleton />
            ) : (
              <TokenAmount amount={balance} decimals={decimals} symbol={symbol} />
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="amount">Amount to Stake</Label>
              <InfoTooltip content="Enter the amount of tokens you want to lock. You can stake multiple times with different lock periods." />
            </div>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="text"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mono flex-1"
                disabled={isWrongNetwork}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMax}
                className="px-3 min-h-[44px]"
                disabled={isWrongNetwork}
                aria-label="Set maximum available balance"
              >
                Max
              </Button>
            </div>
          </div>

          {/* Lock Period Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Lock Period</Label>
              <InfoTooltip content="Select how long to lock your tokens. Longer locks earn higher daily rates but early unstaking incurs a penalty on principal." />
            </div>
            <div 
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              role="radiogroup"
              aria-label="Lock period selection"
            >
              {LOCK_OPTIONS.map((option) => (
                <Button
                  key={Number(option.lockPeriod)}
                  variant={selectedLock.lockPeriod === option.lockPeriod ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLock(option)}
                  className="text-xs min-h-[44px]"
                  disabled={isWrongNetwork}
                  role="radio"
                  aria-checked={selectedLock.lockPeriod === option.lockPeriod}
                  aria-label={`${option.label} lock period, ${Number(option.dailyRate)}% daily rate, ${Number(option.penalty)}% early unstake penalty`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <span>Daily Rate: {Number(selectedLock.dailyRate)}%</span>
                <InfoTooltip content="Percentage of your staked amount you can earn per 24 hours. Rewards stop accruing after 24 hours." />
              </div>
              <div className="flex items-center gap-1">
                <span>Penalty: {Number(selectedLock.penalty)}%</span>
                <InfoTooltip content="If you unstake before the lock period ends, this percentage is deducted from your principal." />
              </div>
            </div>
          </div>

          {/* Estimated Rewards */}
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Maximum Reward (after 1 day)</span>
                <InfoTooltip content="This is the maximum reward you can earn. Rewards cap at 24 hours of accrual. After the lock period + 48 hour grace period, unclaimed rewards are forfeited." />
              </div>
              <TokenAmount 
                amount={estimatedMaxReward} 
                decimals={decimals} 
                symbol={symbol}
                className="text-success font-medium"
              />
            </div>
          </div>

          {/* Gas Hint */}
          <GasHint />

          {/* Action Buttons */}
          <div className="space-y-2">
            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={approve.isPending || approve.isConfirming || isWrongNetwork || hasNoAmount}
                className="w-full"
              >
                {getApproveButtonText()}
              </Button>
            ) : (
              <Button
                onClick={handleStake}
                disabled={!canStake || stake.isPending || stake.isConfirming || isWrongNetwork}
                className="w-full"
              >
                {getStakeButtonText()}
              </Button>
            )}
          </div>

          {/* Transaction Status */}
          {needsApproval ? (
            <TransactionStatus
              isPending={approve.isPending}
              isConfirming={approve.isConfirming}
              isSuccess={approve.isSuccess}
              error={approve.error}
              hash={approve.hash}
              successMessage="Approval confirmed"
              className="justify-center"
            />
          ) : (
            <TransactionStatus
              isPending={stake.isPending}
              isConfirming={stake.isConfirming}
              isSuccess={stake.isSuccess}
              error={stake.error}
              hash={stake.hash}
              successMessage="Stake confirmed"
              className="justify-center"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
