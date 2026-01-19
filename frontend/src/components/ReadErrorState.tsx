import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadErrorStateProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Section-scoped error state for failed contract reads.
 * Displays calm, factual messaging without alarming language.
 * Replaces skeletons when a read fails - never overlaps with loading state.
 */
export function ReadErrorState({ onRetry, isRetrying }: ReadErrorStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-8 px-4 text-center animate-content-fade-in"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle 
        className="h-8 w-8 text-muted-foreground mb-3" 
        aria-hidden="true" 
      />
      <p className="text-sm text-muted-foreground mb-1">
        Unable to load data right now.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Your funds are safe. {isRetrying ? "Retrying…" : "Please try again."}
      </p>
      {onRetry && !isRetrying && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      )}
      {isRetrying && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Retrying...
        </div>
      )}
    </div>
  );
}