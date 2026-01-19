import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { config } from "@/lib/wagmi";
import { SyncStateProvider } from "@/components/SyncStateProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

/**
 * QueryClient configured for network resilience:
 * - Auto-retry failed queries (reads only, not mutations)
 * - Refetch on window focus and reconnect
 * - Stale time prevents unnecessary refetches
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed reads up to 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Auto-refetch when network reconnects
      refetchOnReconnect: true,
      // Auto-refetch when window regains focus (catches wallet reconnects)
      refetchOnWindowFocus: true,
      // Keep data fresh but don't spam refetches
      staleTime: 10_000, // 10 seconds
      // Don't refetch on mount if data is still fresh
      refetchOnMount: true,
    },
    mutations: {
      // CRITICAL: Never auto-retry write transactions
      retry: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          options={{
            initialChainId: 11155111,
          }}
        >
          <SyncStateProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SyncStateProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </ErrorBoundary>
);

export default App;
