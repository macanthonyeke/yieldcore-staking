import { createContext, useContext } from "react";

export interface SyncStateContextType {
  isSyncing: boolean;
  registerFetching: (key: string) => void;
  unregisterFetching: (key: string) => void;
}

export const SyncStateContext = createContext<SyncStateContextType | null>(null);

export function useSyncState() {
  const context = useContext(SyncStateContext);
  if (!context) {
    throw new Error("useSyncState must be used within a SyncStateProvider");
  }
  return context;
}
