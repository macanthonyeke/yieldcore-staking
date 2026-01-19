import { ExternalLink } from "lucide-react";
import { VAULT_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts";

const ETHERSCAN_BASE = "https://sepolia.etherscan.io/address";

export function ContractLinks() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
      <a
        href={`${ETHERSCAN_BASE}/${VAULT_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        Vault Contract
        <ExternalLink className="h-3 w-3" />
      </a>
      <span className="text-border">•</span>
      <a
        href={`${ETHERSCAN_BASE}/${TOKEN_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        Token Contract
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
