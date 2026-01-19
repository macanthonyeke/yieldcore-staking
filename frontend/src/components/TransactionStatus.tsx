import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mapErrorToMessage, isUserRejection } from "@/lib/errorMapping";

interface TransactionStatusProps {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  hash?: `0x${string}`;
  successMessage?: string;
  className?: string;
}

const ETHERSCAN_TX_BASE = "https://sepolia.etherscan.io/tx";

export function TransactionStatus({
  isPending,
  isConfirming,
  isSuccess,
  error,
  hash,
  successMessage = "Transaction confirmed",
  className,
}: TransactionStatusProps) {
  // Don't show anything if no transaction state
  if (!isPending && !isConfirming && !isSuccess && !error) {
    return null;
  }

  // Map error to human-readable message
  const errorMessage = error ? mapErrorToMessage(error) : "";
  const userCancelled = error ? isUserRejection(error) : false;

  // Determine status message for screen readers
  const getStatusMessage = () => {
    if (isPending) return "Waiting for wallet signature";
    if (isConfirming) return "Transaction is being confirmed on the blockchain";
    if (isSuccess) return successMessage;
    if (error) return errorMessage;
    return "";
  };

  return (
    <div 
      className={cn("flex items-center gap-2 text-xs", className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Screen reader announcement */}
      <span className="sr-only">{getStatusMessage()}</span>
      
      {isPending && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground" aria-hidden="true">Waiting for signature...</span>
        </>
      )}
      
      {isConfirming && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-accent" aria-hidden="true" />
          <span className="text-accent" aria-hidden="true">
            Confirming
            {hash && (
              <>
                {" "}
                <a
                  href={`${ETHERSCAN_TX_BASE}/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-accent/80 focus-visible:ring-2 focus-visible:ring-ring rounded"
                  aria-label="View transaction on Etherscan (opens in new tab)"
                >
                  transaction
                </a>
              </>
            )}
            ...
          </span>
        </>
      )}
      
      {isSuccess && !isPending && !isConfirming && (
        <>
          <CheckCircle className="h-3 w-3 text-success" aria-hidden="true" />
          <span className="text-success" aria-hidden="true">{successMessage}</span>
        </>
      )}
      
      {error && !isPending && !isConfirming && (
        <>
          <XCircle className="h-3 w-3 text-destructive" aria-hidden="true" />
          <span 
            className={cn(
              "truncate max-w-[200px]",
              userCancelled ? "text-muted-foreground" : "text-destructive"
            )} 
            aria-hidden="true"
          >
            {errorMessage}
          </span>
        </>
      )}
    </div>
  );
}
