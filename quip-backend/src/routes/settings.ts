import { Router } from "express";
import Logger from "../helpers/logger";
import {
  getSettings,
  hasApiKey,
  setApiKey,
  updateSettings,
  verifyApiKey,
} from "../helpers/config";

const logger = new Logger("SettingsRouter");
const settingsRouter = Router();

/**
 * Whether the service is authoritative for persisting the key. In the packaged
 * app it is not: the desktop shell encrypts it with safeStorage and pushes it
 * down, so a POST here would be silently forgotten on the next restart.
 */
const managedByDesktop = process.env.QUIP_MANAGED === "1";

settingsRouter.get("/", (_req, res) => {
  res.status(200).json({
    openRouterKeyConfigured: hasApiKey(),
    managedByDesktop,
    ...getSettings(),
  });
});

settingsRouter.post("/model", (req, res) => {
  const model = typeof req.body?.model === "string" ? req.body.model : "";
  if (!model.trim()) {
    return res.status(400).json({ success: false, message: "model is required" });
  }
  const next = updateSettings({ model });
  logger.info("POST /model", `Model set to ${next.model}`);
  return res.status(200).json({ success: true, ...next });
});

/**
 * Validates a key and, in standalone mode, adopts it for this process.
 *
 * Under the desktop shell the renderer goes through IPC instead (so the key gets
 * persisted in the OS keychain); this route is then validation-only.
 */
settingsRouter.post("/api-key", async (req, res) => {
  const key = typeof req.body?.apiKey === "string" ? req.body.apiKey : "";
  if (!key.trim()) {
    return res.status(400).json({ success: false, message: "apiKey is required" });
  }

  const check = await verifyApiKey(key);
  if (!check.valid) {
    logger.warn("POST /api-key", `Key rejected: ${check.message}`);
    return res.status(400).json({ success: false, message: check.message, ...check });
  }

  setApiKey(key);
  logger.info("POST /api-key", "Key accepted");
  return res.status(200).json({
    success: true,
    persisted: !managedByDesktop,
    ...check,
  });
});

settingsRouter.delete("/api-key", (_req, res) => {
  setApiKey(null);
  return res.status(200).json({ success: true });
});

export default settingsRouter;
