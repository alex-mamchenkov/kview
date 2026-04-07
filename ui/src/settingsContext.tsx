import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultUserSettings,
  loadUserSettings,
  saveUserSettings,
  type KviewUserSettingsV1,
} from "./settings";

type SettingsContextValue = {
  settings: KviewUserSettingsV1;
  setSettings: React.Dispatch<React.SetStateAction<KviewUserSettingsV1>>;
  replaceSettings: (settings: KviewUserSettingsV1) => void;
  resetSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<KviewUserSettingsV1>(() => loadUserSettings());

  useEffect(() => {
    saveUserSettings(settings);
  }, [settings]);

  const replaceSettings = useCallback((next: KviewUserSettingsV1) => {
    setSettings(next);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultUserSettings());
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setSettings, replaceSettings, resetSettings }),
    [replaceSettings, resetSettings, settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useUserSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  }
  return ctx;
}
