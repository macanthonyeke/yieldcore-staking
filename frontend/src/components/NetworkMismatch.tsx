import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CHAIN_ID } from "@/lib/contracts";

export function NetworkMismatch() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  const handleSwitch = () => {
    switchChain({ chainId: CHAIN_ID });
  };

  return (
    <AnimatePresence>
      {isWrongNetwork && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-warning/10 border border-warning/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground mb-1">
                Wrong Network Detected
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                YieldCore operates on Ethereum Sepolia testnet. Please switch networks to interact with the protocol.
              </p>
              <Button
                onClick={handleSwitch}
                disabled={isPending}
                size="sm"
                variant="outline"
                className="border-warning/50 hover:bg-warning/10"
              >
                {isPending ? "Switching..." : "Switch to Sepolia"}
              </Button>
              {error && (
                <p className="text-xs text-destructive mt-2">
                  {error.message.slice(0, 80)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
