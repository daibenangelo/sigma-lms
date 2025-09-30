"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { cacheManager, ApiCallStats } from "@/lib/cache";

interface ApiCounterContextType {
  stats: ApiCallStats;
  refreshStats: () => void;
  resetStats: () => void;
}

const ApiCounterContext = createContext<ApiCounterContextType | undefined>(undefined);

export function ApiCounterProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<ApiCallStats>({
    totalCalls: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  const refreshStats = () => {
    const currentStats = cacheManager.getStats();
    setStats(currentStats);
  };

  const resetStats = () => {
    cacheManager.resetStats();
    refreshStats();
  };

  useEffect(() => {
    // Initial load
    refreshStats();

    // Poll for updates every second
    const interval = setInterval(refreshStats, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ApiCounterContext.Provider value={{ stats, refreshStats, resetStats }}>
      {children}
    </ApiCounterContext.Provider>
  );
}

export function useApiCounter() {
  const context = useContext(ApiCounterContext);
  if (context === undefined) {
    throw new Error("useApiCounter must be used within an ApiCounterProvider");
  }
  return context;
}
