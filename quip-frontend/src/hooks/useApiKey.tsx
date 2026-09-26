import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/services/api";
import { logger } from "@/lib/logger";

interface ApiKeyState {
  /** null while we have not asked the service yet. */
  configured: boolean | null;
  /** True when the key is kept in the OS keychain rather than a 0600 file. */
  encrypted: boolean;
  /** Set when the service - not the desktop shell - owns the key (browser dev). */
  sessionOnly: boolean;
  refresh: () => Promise<void>;
  save: (key: string) => Promise<{ success: boolean; message?: string }>;
  promptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
}

const ApiKeyContext = createContext<ApiKeyState | null>(null);

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const refresh = useCallback(async () => {
    const result = await api.getSettings();
    if (!result.success || !result.data) {
      logger.api.warn("Could not read service settings");
      return;
    }
    setConfigured(result.data.openRouterKeyConfigured);
    setSessionOnly(!result.data.managedByDesktop);

    if (window.quip) {
      const secret = await window.quip.secretState();
      setEncrypted(secret.encrypted);
    }
  }, []);

  // First run: if there is no key yet, ask for it before the user gets as far as
  // a meeting and discovers summaries are broken.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (configured === false) setPromptOpen(true);
  }, [configured]);

  const save = useCallback(
    async (key: string) => {
      const result = await api.setApiKey(key);
      if (result.success) {
        setConfigured(true);
        if (result.encrypted !== undefined) setEncrypted(result.encrypted);
        setSessionOnly(!result.persisted);
      }
      return { success: result.success, message: result.message };
    },
    []
  );

  const value = useMemo<ApiKeyState>(
    () => ({
      configured,
      encrypted,
      sessionOnly,
      refresh,
      save,
      promptOpen,
      openPrompt: () => setPromptOpen(true),
      closePrompt: () => setPromptOpen(false),
    }),
    [configured, encrypted, sessionOnly, refresh, save, promptOpen]
  );

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};

export function useApiKey(): ApiKeyState {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error("useApiKey must be used inside ApiKeyProvider");
  return ctx;
}
