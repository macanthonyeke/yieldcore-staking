import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shape-matched skeleton for stake cards.
 * Mirrors exact layout of StakeItem to prevent layout shift.
 * STATIC - no animations allowed.
 */
export function StakeSkeleton() {
  return (
    <Card className="border-border bg-card w-full sm:min-w-[280px] flex-shrink-0">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header with status badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Staked Amount and Daily Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>

          {/* Reward Summary Section */}
          <div className="rounded-md bg-muted/30 p-3 space-y-2">
            <Skeleton className="h-3 w-28" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>

          {/* Time Info */}
          <Skeleton className="h-3 w-32" />

          {/* Gas Hint placeholder */}
          <Skeleton className="h-3 w-40" />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 flex-1 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Shape-matched skeleton for activity log entries.
 * Mirrors exact layout of activity log items.
 * STATIC - no animations allowed.
 */
export function ActivityLogSkeleton() {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Inline balance skeleton for header/balance displays.
 * STATIC - no animations allowed.
 */
export function BalanceSkeleton() {
  return <Skeleton className="h-5 w-24 inline-block" />;
}
