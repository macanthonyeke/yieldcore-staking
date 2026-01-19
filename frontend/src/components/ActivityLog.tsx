import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityLog, formatActivityType } from "@/hooks/useActivityLog";
import { useTokenData } from "@/hooks/useTokenData";
import { TokenAmount } from "@/components/TokenAmount";
import { ActivityLogSkeleton } from "@/components/StakeSkeleton";
import { formatDistanceToNow } from "date-fns";

const ETHERSCAN_TX_BASE = "https://sepolia.etherscan.io/tx";

/**
 * Activity Log showing recent user-specific staking actions.
 * Read-only, audit-style visibility.
 * Data is derived exclusively from on-chain events (blockchain is the source of truth).
 */
export function ActivityLog() {
  const { isConnected } = useAccount();
  const { activities, hasActivities, isLoading } = useActivityLog();
  const { decimals, symbol } = useTokenData();

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <ActivityLogSkeleton />
            <ActivityLogSkeleton />
            <ActivityLogSkeleton />
          </div>
        ) : !hasActivities ? (
          <p className="text-sm text-muted-foreground text-center py-4 animate-content-fade-in">
            No activity yet. Actions will appear here after transactions are confirmed.
          </p>
        ) : (
          <ul 
            className="space-y-2 animate-content-fade-in" 
            role="list" 
            aria-label="Recent staking activity"
          >
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 text-sm"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground">
                    {formatActivityType(activity.type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Stake #{activity.stakeIndex + 1}
                    {activity.txHash && (
                      <>
                        {" · "}
                        <a
                          href={`${ETHERSCAN_TX_BASE}/${activity.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          View tx
                        </a>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <TokenAmount
                    amount={BigInt(activity.amount)}
                    decimals={decimals}
                    symbol={symbol}
                    className="text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
