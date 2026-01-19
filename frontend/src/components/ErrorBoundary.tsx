import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

/**
 * Global error boundary to catch unexpected runtime/render errors.
 * Displays a calm, non-alarming fallback UI with recovery options.
 * Never shows stack traces, raw errors, or auto-reloads.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(_: Error): State {
    // Generate a simple error ID for reference (not exposed to user)
    const errorId = `err_${Date.now().toString(36)}`;
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging (console only, never shown to user)
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border bg-card">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                
                <h1 className="text-lg font-semibold text-foreground mb-2">
                  Something didn't load correctly
                </h1>
                
                <p className="text-sm text-muted-foreground mb-2">
                  Your funds are safe.
                </p>
                
                <p className="text-sm text-muted-foreground mb-6">
                  You can refresh or reconnect your wallet to continue.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button
                    onClick={this.handleRefresh}
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Refresh Page
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={this.handleReset}
                    className="flex-1 gap-2"
                  >
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    Try Again
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-6">
                  If this issue persists, try disconnecting and reconnecting your wallet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}