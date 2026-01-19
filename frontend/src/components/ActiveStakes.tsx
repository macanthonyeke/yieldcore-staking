import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStakingData } from "@/hooks/useStakingData";
import { StakeItem } from "./StakeItem";
import { StakeSkeleton } from "./StakeSkeleton";
import { ReadErrorState } from "./ReadErrorState";

const STAKES_PER_PAGE = 2;

interface ActiveStakesProps {
  refreshTrigger: number;
}

export function ActiveStakes({ refreshTrigger }: ActiveStakesProps) {
  const { isConnected } = useAccount();
  const { stakes, refetch, isLoading, isError, isFetching, isConfirmedEmpty, isDataReady } = useStakingData();
  const [currentPage, setCurrentPage] = useState(0);

  // Refetch stakes when refreshTrigger changes (e.g., after successful stake)
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // CRITICAL: Return the refetch promise so StakeItem can await completion
  const handleActionSuccess = async () => {
    return refetch();
  };

  const totalPages = useMemo(() => {
    return Math.ceil(stakes.length / STAKES_PER_PAGE);
  }, [stakes.length]);

  const currentStakes = useMemo(() => {
    const start = currentPage * STAKES_PER_PAGE;
    return stakes.slice(start, start + STAKES_PER_PAGE);
  }, [stakes, currentPage]);

  // Reset to first page if current page becomes invalid
  useMemo(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (!isConnected) {
    return null;
  }

  // Error state - show when read fails (replaces skeletons, never overlaps)
  if (isError && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Active Stakes</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadErrorState onRetry={refetch} isRetrying={isFetching} />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Only show skeleton on initial load for this address
  // Never show skeleton during refetches - keep existing data visible
  // The hook guarantees stakes array contains last-valid data during refetch
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Active Stakes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 overflow-hidden">
              <StakeSkeleton />
              <StakeSkeleton />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Only show empty state when data is CONFIRMED empty
  // This requires: reads enabled, count query succeeded, count === 0
  // NEVER infer empty from missing/undefined/loading data
  if (isConfirmedEmpty && stakes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Active Stakes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm text-center py-4 animate-content-fade-in">
              You have no active stakes.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // If we're not loading, no error, but data isn't confirmed ready yet,
  // show skeletons (this covers edge cases during initialization)
  if (!isDataReady && !isError && stakes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Active Stakes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 overflow-hidden">
              <StakeSkeleton />
              <StakeSkeleton />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Your Active Stakes</CardTitle>
          <span className="text-sm text-muted-foreground">
            {stakes.length} stake{stakes.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stakes Container with horizontal layout */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex flex-col sm:flex-row gap-3"
              >
                {currentStakes.map((stake, idx) => (
                  <div key={`${stake.index}-${stake.rewardsClaimed.toString()}`} className="w-full sm:flex-1 sm:min-w-0">
                    <StakeItem
                      stake={stake}
                      index={currentPage * STAKES_PER_PAGE + idx}
                      onActionSuccess={handleActionSuccess}
                    />
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav 
              className="flex items-center justify-center gap-2 pt-2"
              aria-label="Stakes pagination"
              role="navigation"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrev}
                disabled={currentPage === 0}
                className="h-11 w-11"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              
              <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "ghost"}
                    size="sm"
                    onClick={() => goToPage(i)}
                    className="h-11 w-11 p-0"
                    aria-label={`Page ${i + 1}`}
                    aria-current={currentPage === i ? "page" : undefined}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                disabled={currentPage === totalPages - 1}
                className="h-11 w-11"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
