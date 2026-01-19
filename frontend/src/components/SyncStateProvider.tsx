import { useState, useCallback, useMemo, ReactNode } from "react";
import { SyncStateContext } from "@/hooks/useSyncState";

interface SyncStateProviderProps {
  children: ReactNode;
}

export function SyncStateProvider({ children }: SyncStateProviderProps) {
  const [fetchingKeys, setFetchingKeys] = useState<Set<string>>(new Set());

  const registerFetching = useCallback((key: string) => {
    setFetchingKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const unregisterFetching = useCallback((key: string) => {
    setFetchingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isSyncing = fetchingKeys.size > 0;

  const value = useMemo(
    () => ({ isSyncing, registerFetching, unregisterFetching }),
    [isSyncing, registerFetching, unregisterFetching]
  );

  return (
    <SyncStateContext.Provider value={value}>
      {children}
    </SyncStateContext.Provider>
  );
}
