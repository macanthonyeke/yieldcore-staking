import { ConnectKitButton } from "connectkit";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NetworkStatus } from "@/components/NetworkStatus";
import { SyncIndicator } from "@/components/SyncIndicator";

// Motion variants with reduced motion support
const fadeInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
};

const fadeInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
};

export function Header() {
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const motionProps = prefersReducedMotion 
    ? { initial: false, animate: true }
    : { transition: { duration: 0.3 } };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Skip link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="skip-link"
      >
        Skip to main content
      </a>
      
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <motion.div 
          className="flex items-center gap-2"
          {...fadeInLeft}
          {...motionProps}
        >
          <div 
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-primary-foreground font-bold text-sm">YC</span>
          </div>
          <span className="font-semibold text-lg text-foreground">
            <span className="sr-only">YieldCore - </span>
            YieldCore
          </span>
          <SyncIndicator />
        </motion.div>

        <motion.div
          {...fadeInRight}
          {...motionProps}
          {...(prefersReducedMotion ? {} : { transition: { duration: 0.3, delay: 0.1 } })}
          className="flex items-center gap-3"
        >
          <NetworkStatus />
          <ThemeToggle />
          <ConnectKitButton />
        </motion.div>
      </div>
    </header>
  );
}
