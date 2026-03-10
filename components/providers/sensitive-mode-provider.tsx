"use client";

import { SensitiveModeContext, useSensitiveModeState } from "@/hooks/use-sensitive-mode";

export function SensitiveModeProvider({ children }: { children: React.ReactNode }) {
  const value = useSensitiveModeState();

  return (
    <SensitiveModeContext.Provider value={value}>
      {children}
    </SensitiveModeContext.Provider>
  );
}
