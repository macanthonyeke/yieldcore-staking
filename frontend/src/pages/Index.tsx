import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { StakeCard } from "@/components/StakeCard";
import { ActiveStakes } from "@/components/ActiveStakes";
import { NetworkMismatch } from "@/components/NetworkMismatch";
import { ContractLinks } from "@/components/ContractLinks";
import { VaultRules } from "@/components/VaultRules";
import { ActivityLog } from "@/components/ActivityLog";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleStakeSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container mx-auto px-4 py-8 max-w-4xl" tabIndex={-1}>
        <div className="space-y-6">
          <NetworkMismatch />
          <VaultRules />
          <StakeCard onStakeSuccess={handleStakeSuccess} />
          <ActiveStakes refreshTrigger={refreshTrigger} />
          <ActivityLog />
          <ContractLinks />
        </div>
      </main>
    </div>
  );
};

export default Index;
