import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible rules summary explaining how the vault works.
 * Read-only, informational content. Collapsed by default.
 */
export function VaultRules() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border bg-card min-h-[44px]">
        <span>How This Vault Works</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Rewards accrue linearly over time</li>
            <li>Rewards stop accruing after 24 hours</li>
            <li>Lock period controls when funds can be withdrawn</li>
            <li>Early unstaking applies a penalty</li>
            <li>Expired stakes forfeit unclaimed rewards</li>
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
