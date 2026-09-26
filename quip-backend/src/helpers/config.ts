import fs from "fs";
import Logger from "./logger";
import { settingsPath } from "./paths";

const logger = new Logger("Config");

/** Model used for summarisation. Overridable through settings.json. */
const DEFAULT_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free";

export interface Settings {
  /** OpenRouter model slug used for summarisation. */
  model: string;
}

/**
 * The OpenRouter API key is deliberately NOT persisted by the service.
 *
 * In the packaged app the desktop shell owns it: it is encrypted with Electron's
 * safeStorage (OS keychain / DPAPI) under userData and handed to this process at
 * spawn time via QUIP_OPENROUTER_API_KEY, then refreshed over IPC when the user
 * changes it. Standalone (`npm start`) it comes from OPEN_ROUTER_API_KEY / .env.
 *
 * Nothing secret is ever written to settings.json.
 */
let apiKey: string | null =
  process.env.QUIP_OPENROUTER_API_KEY?.trim() ||
  process.env.OPEN_ROUTER_API_KEY?.trim() ||
  null;

let settings: Settings = { model: DEFAULT_MODEL };

/** Reads non-secret settings from disk. Safe to call more than once. */
export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    settings = { model: parsed.model?.trim() || DEFAULT_MODEL };
    logger.info("loadSettings", `Settings loaded (model=${settings.model})`);
  } catch {
    logger.info("loadSettings", "No settings.json yet - using defaults");
  }
  return settings;
}

export function getSettings(): Settings {
  return settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  settings = { ...settings, ...(patch.model ? { model: patch.model.trim() } : {}) };
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  logger.info("updateSettings", `Settings saved (model=${settings.model})`);
  return settings;
}

export function getApiKey(): string | null {
  return apiKey;
}

export function hasApiKey(): boolean {
  return !!apiKey;
}

export function setApiKey(key: string | null): void {
  apiKey = key?.trim() ? key.trim() : null;
  logger.info("setApiKey", apiKey ? "OpenRouter API key set" : "OpenRouter API key cleared");
}

/** Thrown when a route needs the key and the user has not supplied one yet. */
export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "No OpenRouter API key configured. Add your key in Quip's settings to enable summaries."
    );
    this.name = "MissingApiKeyError";
  }
}

export function requireApiKey(): string {
  if (!apiKey) throw new MissingApiKeyError();
  return apiKey;
}

export interface KeyCheckResult {
  valid: boolean;
  /** Human-readable reason when invalid. */
  message?: string;
  /** OpenRouter's label for the key, when it tells us one. */
  label?: string;
  /** Remaining credit, when OpenRouter reports a limit. */
  limitRemaining?: number | null;
}

/**
 * Cheap liveness check against OpenRouter so the settings UI can tell the user
 * straight away whether the key they pasted actually works, instead of failing
 * later in the middle of a meeting.
 */
export async function verifyApiKey(key: string): Promise<KeyCheckResult> {
  const candidate = key.trim();
  if (!candidate) return { valid: false, message: "Key is empty" };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${candidate}` },
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401 || res.status === 403) {
      return { valid: false, message: "OpenRouter rejected this key" };
    }
    if (!res.ok) {
      return { valid: false, message: `OpenRouter returned ${res.status}` };
    }

    const body = (await res.json()) as { data?: { label?: string; limit_remaining?: number | null } };
    return {
      valid: true,
      ...(body.data?.label ? { label: body.data.label } : {}),
      limitRemaining: body.data?.limit_remaining ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logger.warn("verifyApiKey", `Could not reach OpenRouter: ${message}`);
    return { valid: false, message: `Could not reach OpenRouter: ${message}` };
  }
}
