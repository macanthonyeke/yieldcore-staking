import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CHAIN_ID } from "@/lib/contracts";

const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  137: "Polygon",
  42161: "Arbitrum",
  10: "Optimism",
  8453: "Base",
};

export function NetworkStatus() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return null;
  }

  const isCorrectNetwork = chainId === CHAIN_ID;
  const networkName = NETWORK_NAMES[chainId] || `Chain ${chainId}`;

  const handleSwitchNetwork = () => {
    switchChain?.({ chainId: CHAIN_ID });
  };

  if (isCorrectNetwork) {
    return (
      <div 
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        role="status"
        aria-label={`Connected to ${networkName} network`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-hidden="true" />
        <span className="hidden sm:inline">{networkName}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSwitchNetwork}
      className="flex items-center gap-1.5 text-xs text-warning hover:text-warning/80 transition-colors min-h-[44px] px-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Connected to wrong network: ${networkName}. Click to switch to Sepolia.`}
    >
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">{networkName}</span>
      <span className="sm:hidden">Wrong Network</span>
    </button>
  );
}
