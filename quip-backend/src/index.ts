import type { AddressInfo } from "net";
import express from "express";
import cors from "cors";
import googleBotRouter from "./routes/google_meet_bot";
import botProfileRouter from "./routes/bot_profile";
import summaryrouter from "./routes/summary";
import settingsRouter from "./routes/settings";
import Logger from "./helpers/logger";
import { dataRoot } from "./helpers/paths";
import { loadSettings, setApiKey } from "./helpers/config";
import { closeBrowser } from "./services/google_meet_bot/browser";

// Only useful standalone; in the packaged app the key arrives from the desktop
// shell and there is no .env on disk to read.
if (!process.env.QUIP_MANAGED) {
  require("dotenv/config");
}

const logger = new Logger("Service");

loadSettings();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/google-bot", googleBotRouter);
app.use("/bot-profile", botProfileRouter);
app.use("/ai", summaryrouter);
app.use("/settings", settingsRouter);

app.get("/test", (req, res) => {
  res.send("Hello World!");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, pid: process.pid, dataDir: dataRoot() });
});

// Port 0 lets the OS pick a free port, which removes the "3000 is taken" class of
// failure outright; the desktop supervisor learns the real port over IPC.
// 127.0.0.1 (not 0.0.0.0) keeps the API off the local network.
const server = app.listen(Number(process.env.PORT ?? 0), "127.0.0.1", () => {
  const { port } = server.address() as AddressInfo;
  logger.info("listen", `Service listening on http://127.0.0.1:${port}`);
  logger.info("listen", `Data directory: ${dataRoot()}`);
  process.parentPort?.postMessage({ type: "ready", port });
});

let shuttingDown = false;

async function shutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown", `Shutting down (${reason})`);

  // Hard deadline: never let a wedged Chromium keep the app from quitting.
  const force = setTimeout(() => {
    logger.warn("shutdown", "Forced exit after timeout");
    process.exit(1);
  }, 8000);
  force.unref();

  await closeBrowser();
  server.close(() => {
    clearTimeout(force);
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.parentPort?.on("message", (e: { data?: { type?: string; apiKey?: string | null } }) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === "shutdown") {
    void shutdown("parent request");
    return;
  }

  // The desktop shell owns the OpenRouter key and pushes it here on start and
  // whenever the user changes it in settings.
  if (msg.type === "api-key") {
    setApiKey(msg.apiKey ?? null);
  }
});

// Playwright routinely rejects with "Target page, context or browser has been
// closed" when a Meet tab navigates away. Log it and let the supervisor decide,
// rather than letting Node's default kill the process silently.
process.on("unhandledRejection", (err) => {
  logger.error("unhandledRejection", "Unhandled promise rejection", err);
});

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", "Uncaught exception - shutting down", err);
  void shutdown("uncaughtException");
});
