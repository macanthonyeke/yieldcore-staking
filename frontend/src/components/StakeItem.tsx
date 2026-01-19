import { useMemo, useEffect, useState } from "react";
import { useChainId } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StakeData } from "@/hooks/useStakingData";
import { useTokenData } from "@/hooks/useTokenData";
import { useClaimReward, useUnstake } from "@/hooks/useContractActions";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { LOCK_OPTIONS, GRACE_PERIOD, CHAIN_ID } from "@/lib/contracts";
import {
  formatTimeRemaining,
  calculateClaimableReward,
  isStakeExpired,
  isStakeUnlocked,
  hasReachedMaxReward,
} from "@/lib/rewards";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TokenAmount } from "@/components/TokenAmount";
import { EarlyUnstakeModal } from "@/components/EarlyUnstakeModal";
import { TransactionStatus } from "@/components/TransactionStatus";
import { GasHint } from "@/components/GasHint";
import { toast } from "sonner";
interface StakeItemProps {
  stake: StakeData;
  index: number;
  onActionSuccess: () => Promise<unknown>;
}

export function StakeItem({ stake, index, onActionSuccess }: StakeItemProps) {
  const { symbol, decimals } = useTokenData();
  const chainId = useChainId();
  const isWrongNetwork = chainId !== CHAIN_ID;
  const currentTime = useCurrentTime();
  const claimAction = useClaimReward();
  const unstakeAction = useUnstake();
  const [showEarlyUnstakeModal, setShowEarlyUnstakeModal] = useState(false);

  const lockOption = useMemo(() => {
    return LOCK_OPTIONS.find((o) => o.lockPeriod === stake.lockPeriod) || LOCK_OPTIONS[0];
  }, [stake.lockPeriod]);

  const elapsed = useMemo(() => {
    const diff = currentTime - stake.startTime;
    return diff > 0n ? diff : 0n;
  }, [currentTime, stake.startTime]);

  const claimableReward = useMemo(() => {
    return calculateClaimableReward(
      stake.amount,
      stake.fixedRate,
      elapsed,
      stake.rewardsClaimed
    );
  }, [stake.amount, stake.fixedRate, elapsed, stake.rewardsClaimed]);

  const isExpired = useMemo(() => {
    return isStakeExpired(stake.startTime, stake.lockPeriod, currentTime);
  }, [stake.startTime, stake.lockPeriod, currentTime]);

  const isUnlocked = useMemo(() => {
    return isStakeUnlocked(stake.startTime, stake.lockPeriod, currentTime);
  }, [stake.startTime, stake.lockPeriod, currentTime]);

  const maxRewardReached = useMemo(() => {
    return hasReachedMaxReward(stake.startTime, currentTime);
  }, [stake.startTime, currentTime]);

  const timeUntilUnlock = useMemo(() => {
    const unlockTime = stake.startTime + stake.lockPeriod;
    if (currentTime >= unlockTime) return 0n;
    return unlockTime - currentTime;
  }, [stake.startTime, stake.lockPeriod, currentTime]);

  const timeUntilExpiry = useMemo(() => {
    const expiryTime = stake.startTime + stake.lockPeriod + GRACE_PERIOD;
    if (currentTime >= expiryTime) return 0n;
    return expiryTime - currentTime;
  }, [stake.startTime, stake.lockPeriod, currentTime]);

  // Check if nearing grace period expiry (less than 1 hour remaining)
  const isNearingExpiry = useMemo(() => {
    return isUnlocked && !isExpired && timeUntilExpiry <= 3600n;
  }, [isUnlocked, isExpired, timeUntilExpiry]);

  // Handle success callbacks with toasts
  // CRITICAL: Await refetch completion BEFORE resetting to ensure fresh data renders
  useEffect(() => {
    if (claimAction.isSuccess) {
      toast.success("Rewards claimed on-chain", {
        description: `Stake #${stake.displayNumber} rewards collected`,
      });
      // Await the refetch to complete, then reset action state
      onActionSuccess().then(() => {
        claimAction.reset();
      }).catch(() => {
        claimAction.reset();
      });
    }
  }, [claimAction.isSuccess, claimAction.reset, onActionSuccess, stake.displayNumber]);

  useEffect(() => {
    if (unstakeAction.isSuccess) {
      toast.success("Unstake confirmed on-chain", {
        description: `Stake #${stake.displayNumber} tokens returned`,
      });
      // Await the refetch to complete, then reset action state
      onActionSuccess().then(() => {
        unstakeAction.reset();
      }).catch(() => {
        unstakeAction.reset();
      });
    }
  }, [unstakeAction.isSuccess, unstakeAction.reset, onActionSuccess, stake.displayNumber]);

  const handleClaim = () => {
    claimAction.claimReward(BigInt(stake.index));
  };

  const handleUnstakeClick = () => {
    if (!isUnlocked) {
      // Show confirmation modal for early unstake
      setShowEarlyUnstakeModal(true);
    } else {
      // Direct unstake for unlocked stakes
      unstakeAction.unstake(BigInt(stake.index));
    }
  };

  const handleConfirmEarlyUnstake = () => {
    setShowEarlyUnstakeModal(false);
    unstakeAction.unstake(BigInt(stake.index));
  };

  const isPending = claimAction.isPending || claimAction.isConfirming || 
                    unstakeAction.isPending || unstakeAction.isConfirming;

  // Smart button text for claim
  const getClaimButtonText = (): string => {
    if (claimAction.isPending) return "Confirm...";
    if (claimAction.isConfirming) return "Confirming...";
    if (isWrongNetwork) return "Wrong Network";
    if (isExpired) return "Stake Expired";
    if (claimableReward <= 0n) return "No Rewards";
    return "Claim Rewards";
  };

  // Smart button text for unstake
  const getUnstakeButtonText = (): string => {
    if (unstakeAction.isPending) return "Confirm...";
    if (unstakeAction.isConfirming) return "Confirming...";
    if (isWrongNetwork) return "Wrong Network";
    if (isUnlocked) return "Unstake";
    return `Unstake (-${Number(lockOption.penalty)}%)`;
  };

  const canClaim = !isExpired && claimableReward > 0n && !isWrongNetwork;
  const canUnstake = !isWrongNetwork;

  // Determine which transaction status to show
  const showClaimStatus = claimAction.isPending || claimAction.isConfirming || claimAction.isSuccess || claimAction.error;
  const showUnstakeStatus = unstakeAction.isPending || unstakeAction.isConfirming || unstakeAction.isSuccess || unstakeAction.error;

  return (
    <>
      <Card 
        className={`border-border bg-card w-full sm:min-w-[280px] flex-shrink-0 ${isExpired ? 'opacity-75' : ''}`}
        role="article"
        aria-label={`Stake ${stake.displayNumber}: ${isExpired ? 'Expired' : isUnlocked ? 'Unlocked' : 'Locked'}`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Header with status badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Stake #{stake.displayNumber}</span>
                <Badge variant="secondary" className="text-xs">
                  {lockOption.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isExpired ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="destructive" className="text-xs">
                      <span aria-hidden="true">⊘</span> Expired
                    </Badge>
                    <InfoTooltip content="Grace period has ended. Rewards are forfeited. Only principal can be withdrawn." />
                  </div>
                ) : isUnlocked ? (
                  <div className="flex items-center gap-1">
                    <Badge className="bg-success text-success-foreground text-xs">
                      <span aria-hidden="true">✓</span> Unlocked
                    </Badge>
                    <InfoTooltip content="Lock period complete. You can unstake without penalty. Claim rewards before the 48h grace period ends." />
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      <span aria-hidden="true">🔒</span> Locked
                    </Badge>
                    <InfoTooltip content="Tokens are locked. Early unstaking incurs a penalty on principal." />
                  </div>
                )}
                {maxRewardReached && !isExpired && (
                  <div className="flex items-center gap-1">
                    <Badge className="bg-warning text-warning-foreground text-xs">
                      <span aria-hidden="true">⚡</span> Max Reward
                    </Badge>
                    <InfoTooltip content="24 hours of rewards have accrued. Rewards will not increase further." />
                  </div>
                )}
              </div>
            </div>

            {/* Staked Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Staked Amount</p>
                <TokenAmount 
                  amount={stake.amount} 
                  decimals={decimals} 
                  symbol={symbol}
                  className="font-medium"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Daily Rate</p>
                <p className="mono text-foreground">
                  {Number(stake.fixedRate)}%
                </p>
              </div>
            </div>

            {/* Reward Summary */}
            {isExpired ? (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive font-medium">
                  Rewards Forfeited. Principal Only.
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reward Summary</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-xs text-muted-foreground">Rewards Accrued</p>
                      <InfoTooltip content="Total rewards earned so far for this stake. Derived from on-chain data." />
                    </div>
                    <TokenAmount 
                      amount={claimableReward + stake.rewardsClaimed} 
                      decimals={decimals} 
                      symbol={symbol}
                      className="text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-xs text-muted-foreground">Rewards Claimed</p>
                      <InfoTooltip content="Total rewards already claimed for this stake." />
                    </div>
                    <TokenAmount 
                      amount={stake.rewardsClaimed} 
                      decimals={decimals} 
                      symbol={symbol}
                      className="text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-xs text-muted-foreground">Available to Claim</p>
                      <InfoTooltip content="Rewards you can claim now. Updates after confirmed transactions." />
                    </div>
                    <TokenAmount 
                      amount={claimableReward > 0n ? claimableReward : 0n} 
                      decimals={decimals} 
                      symbol={symbol}
                      className={claimableReward > 0n ? "text-success text-sm font-medium" : "text-muted-foreground text-sm"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Time Info */}
            {!isExpired && !isUnlocked && (
              <div className="text-xs text-muted-foreground">
                Time until unlock: <span className="mono">{formatTimeRemaining(timeUntilUnlock)}</span>
              </div>
            )}
            {isUnlocked && !isExpired && (
              <div className="text-xs text-muted-foreground">
                Time until expiry: <span className="mono text-warning">{formatTimeRemaining(timeUntilExpiry)}</span>
              </div>
            )}

            {/* Contextual Warnings */}
            {!isUnlocked && !isExpired && (
              <p className="text-xs text-warning">
                Early unstaking applies a penalty.
              </p>
            )}
            {isNearingExpiry && (
              <p className="text-xs text-warning">
                Rewards will be forfeited after the grace period.
              </p>
            )}

            {/* Gas Hint */}
            <GasHint />

            {/* Actions */}
            <div className="flex gap-2" role="group" aria-label="Stake actions">
              {!isExpired && (
              <Button
                  onClick={handleClaim}
                  disabled={!canClaim || isPending}
                  size="sm"
                  className="flex-1 min-h-[44px]"
                  aria-label={`Claim rewards for stake ${stake.displayNumber}`}
                >
                  {getClaimButtonText()}
                </Button>
              )}
              
              <Button
                onClick={handleUnstakeClick}
                disabled={!canUnstake || isPending}
                variant={isUnlocked ? (isExpired ? "default" : "outline") : "destructive"}
                size="sm"
                className="flex-1 min-h-[44px]"
                aria-label={`${isUnlocked ? 'Unstake' : `Early unstake with ${Number(lockOption.penalty)}% penalty`} stake ${stake.displayNumber}`}
              >
                {getUnstakeButtonText()}
              </Button>
            </div>

            {/* Transaction Status */}
            {showClaimStatus && (
              <TransactionStatus
                isPending={claimAction.isPending}
                isConfirming={claimAction.isConfirming}
                isSuccess={claimAction.isSuccess}
                error={claimAction.error}
                hash={claimAction.hash}
                successMessage="Rewards claimed"
              />
            )}
            {showUnstakeStatus && (
              <TransactionStatus
                isPending={unstakeAction.isPending}
                isConfirming={unstakeAction.isConfirming}
                isSuccess={unstakeAction.isSuccess}
                error={unstakeAction.error}
                hash={unstakeAction.hash}
                successMessage="Unstake confirmed"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Early Unstake Confirmation Modal */}
      <EarlyUnstakeModal
        open={showEarlyUnstakeModal}
        onOpenChange={setShowEarlyUnstakeModal}
        penaltyPercent={Number(lockOption.penalty)}
        onConfirm={handleConfirmEarlyUnstake}
      />
    </>
  );
}
