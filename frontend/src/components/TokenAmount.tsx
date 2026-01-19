import { useMemo, useRef, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TokenAmountProps {
  amount: bigint;
  decimals?: number;
  symbol?: string;
  className?: string;
}

/**
 * Formats bigint to rounded display (4 decimals)
 */
function formatRounded(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const displayDecimals = fractionalStr.slice(0, 4);
  return `${integerPart.toString()}.${displayDecimals}`;
}

/**
 * Formats bigint to full precision display
 */
function formatExact(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  // Trim trailing zeros but keep at least 4 decimals
  const trimmed = fractionalStr.replace(/0+$/, "");
  const displayDecimals = trimmed.length >= 4 ? trimmed : fractionalStr.slice(0, Math.max(4, trimmed.length));
  return `${integerPart.toString()}.${displayDecimals}`;
}

export function TokenAmount({ amount, decimals = 18, symbol, className }: TokenAmountProps) {
  const roundedValue = useMemo(() => formatRounded(amount, decimals), [amount, decimals]);
  const exactValue = useMemo(() => formatExact(amount, decimals), [amount, decimals]);
  
  // Track previous value to detect confirmed changes
  const prevAmountRef = useRef<bigint | null>(null);
  const isInitialRender = useRef(true);
  const [transitionKey, setTransitionKey] = useState(0);
  
  // Trigger fade transition only on confirmed value changes (not initial render)
  useEffect(() => {
    if (isInitialRender.current) {
      // First render - store initial value, no transition
      isInitialRender.current = false;
      prevAmountRef.current = amount;
      return;
    }
    
    // Only trigger transition if value actually changed
    if (prevAmountRef.current !== null && prevAmountRef.current !== amount) {
      setTransitionKey(prev => prev + 1);
    }
    
    prevAmountRef.current = amount;
  }, [amount]);
  
  const displayText = symbol ? `${roundedValue} ${symbol}` : roundedValue;
  const exactText = symbol ? `${exactValue} ${symbol}` : exactValue;
  
  // Only show tooltip if values differ
  const showTooltip = roundedValue !== exactValue;

  // Soft fade transition on value change - no color change, just opacity
  const baseClassName = cn(
    "mono inline-block animate-value-update",
    className
  );

  const content = (
    <span 
      key={transitionKey} 
      className={baseClassName}
    >
      {displayText}
    </span>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            key={transitionKey} 
            className={cn(baseClassName, "cursor-default")}
          >
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="mono text-xs">
          {exactText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
