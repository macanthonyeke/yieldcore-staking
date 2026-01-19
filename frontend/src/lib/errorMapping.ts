/**
 * Maps common contract and wallet errors to human-readable messages.
 * Rules:
 * - Explain what went wrong, not blame the user
 * - Never expose raw revert strings
 */

interface ErrorMapping {
  pattern: RegExp | string;
  message: string;
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // ERC20 errors
  { pattern: /ERC20InsufficientBalance|transfer amount exceeds balance/i, message: "Insufficient token balance" },
  { pattern: /ERC20InsufficientAllowance|allowance/i, message: "Token approval required" },
  { pattern: /ERC20InvalidSpender|ERC20InvalidApprover/i, message: "Invalid approval target" },
  
  // Staking/Lock errors
  { pattern: /too early|still locked|lock period/i, message: "Stake is still locked" },
  { pattern: /not active|stake does not exist/i, message: "Stake not found or already withdrawn" },
  { pattern: /expired|grace period/i, message: "Stake has expired" },
  
  // Reward errors
  { pattern: /no reward|zero reward|nothing to claim/i, message: "No rewards available to claim" },
  { pattern: /insufficient.*reward.*pool|reward pool/i, message: "Insufficient rewards in pool" },
  
  // General transaction errors
  { pattern: /user rejected|user denied|rejected by user/i, message: "Transaction cancelled" },
  { pattern: /insufficient funds for gas/i, message: "Insufficient ETH for network fees" },
  { pattern: /nonce too low|replacement.*underpriced/i, message: "Transaction conflict, please try again" },
  { pattern: /execution reverted/i, message: "Transaction failed" },
  
  // Network errors
  { pattern: /network.*changed|chain.*mismatch/i, message: "Network changed during transaction" },
  { pattern: /disconnected|connection/i, message: "Wallet connection lost" },
  
  // Paused contract
  { pattern: /paused|EnforcedPause/i, message: "Contract is currently paused" },
  
  // Reentrancy
  { pattern: /reentrancy|ReentrancyGuard/i, message: "Transaction in progress, please wait" },
];

/**
 * Converts a contract or wallet error to a human-readable message.
 * Falls back to a generic message if no pattern matches.
 */
export function mapErrorToMessage(error: Error | null | undefined): string {
  if (!error) return "Unknown error";
  
  const errorString = error.message || String(error);
  
  for (const mapping of ERROR_MAPPINGS) {
    if (typeof mapping.pattern === "string") {
      if (errorString.toLowerCase().includes(mapping.pattern.toLowerCase())) {
        return mapping.message;
      }
    } else if (mapping.pattern.test(errorString)) {
      return mapping.message;
    }
  }
  
  // Fallback: return a generic message
  return "Transaction failed";
}

/**
 * Checks if the error is a user-initiated cancellation
 */
export function isUserRejection(error: Error | null | undefined): boolean {
  if (!error) return false;
  const errorString = error.message || String(error);
  return /user rejected|user denied|rejected by user/i.test(errorString);
}
