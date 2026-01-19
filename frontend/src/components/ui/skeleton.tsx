import { cn } from "@/lib/utils";

/**
 * Static skeleton placeholder - NO animation.
 * Animations are forbidden in financial UI skeletons.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md bg-muted/60", className)} {...props} />;
}

export { Skeleton };
