/** Shape of the preload bridge (quip-desktop/preload.js). Absent in a browser. */
export interface ServiceState {
  state: "starting" | "running" | "restarting" | "failed" | "dead";
  apiBase?: string | null;
  attempt?: number;
  code?: number;
  error?: string;
}

export interface SecretState {
  hasKey: boolean;
  /** False when the OS has no keyring, so the key is stored as 0600 plaintext. */
  encrypted: boolean;
}

export interface SetApiKeyResult {
  success: boolean;
  cleared?: boolean;
  persisted?: boolean;
  encrypted?: boolean;
  label?: string;
  limitRemaining?: number | null;
  message?: string;
}

export interface QuipBridge {
  isDesktop: true;
  platform: string;
  apiBase(): Promise<string>;
  serviceState(): Promise<ServiceState>;
  restartService(): Promise<string>;
  secretState(): Promise<SecretState>;
  setApiKey(key: string): Promise<SetApiKeyResult>;
  openExternal(url: string): Promise<void>;
  openDataDir(): Promise<string>;
  onServiceState(cb: (state: ServiceState) => void): () => void;
}

declare global {
  interface Window {
    quip?: QuipBridge;
  }
}
