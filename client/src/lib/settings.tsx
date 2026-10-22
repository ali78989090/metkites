import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { PublicSettings } from "./types";

const FALLBACK: PublicSettings = {
  business: {
    name: "Metro Lahore Kites",
    whatsapp: "",
    phone: "",
    email: "",
    address: "Lahore, Pakistan",
    deliveryCoverage: "",
    logoPath: "/img/logo/metrolahorekites.png",
  },
  preorders: { enabled: true, instructions: "", terms: "" },
  legal: { notice: "" },
  statusMessages: {},
  options: { kiteSizes: [], guddaSizes: [], dorTypes: [], cities: ["Lahore"] },
};

interface SettingsContextValue {
  settings: PublicSettings;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: FALLBACK, ready: false });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) => {
        if (!cancelled) setSettings({ ...FALLBACK, ...data.settings });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ settings, ready }), [settings, ready]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
