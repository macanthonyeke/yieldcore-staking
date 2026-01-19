import { useSyncState } from "@/hooks/useSyncState";

export function SyncIndicator() {
  const { isSyncing } = useSyncState();

  if (!isSyncing) {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
      <span>Syncing…</span>
    </div>
  );
}
