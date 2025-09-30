"use client";

import { ApiCounterProvider } from "@/contexts/api-counter-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApiCounterProvider>
      {children}
    </ApiCounterProvider>
  );
}
