"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Settings from "./setting";

type SettingsContextValue = {
  openSettings: () => void;
  closeSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);

  return (
    <SettingsContext.Provider value={{ openSettings, closeSettings }}>
      {children}
      <Settings open={open} onClose={closeSettings} />
    </SettingsContext.Provider>
  );
}
