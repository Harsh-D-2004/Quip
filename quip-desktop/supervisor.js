"use strict";

const fs = require("fs");
const path = require("path");
const { app, utilityProcess } = require("electron");
const secrets = require("./secrets");

/**
 * Owns the service process.
 *
 * utilityProcess.fork (rather than child_process.spawn) ties the child to the
 * app lifecycle: it cannot outlive a crashed parent, so there is no orphan left
 * holding a port or a headless Chromium. It also gives a real message channel,
 * so the port handshake does not depend on scraping stdout.
 */

const MAX_RESTARTS = 3;
const START_TIMEOUT_MS = 20000;

let child = null;
let apiBase = null;
let restarts = 0;
let startPromise = null;
let stopping = false;
let onStateChange = () => {};
let logStream = null;

function logFile() {
  const dir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "service.log");
}

function log(stream, chunk) {
  const text = chunk.toString();
  process.stdout.write(`[service:${stream}] ${text}`);
  try {
    if (!logStream) logStream = fs.createWriteStream(logFile(), { flags: "a" });
    logStream.write(text);
  } catch {
    /* logging must never take the app down */
  }
}

function servicePath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "service", "app", "dist", "index.js")
    : path.join(__dirname, "..", "quip-backend", "dist", "index.js");
}

function browsersPath() {
  // In dev this is the directory scripts/stage-browsers.mjs writes, so
  // `npm run dev` uses the exact Chromium the installer will ship.
  return app.isPackaged
    ? path.join(process.resourcesPath, "ms-playwright")
    : path.join(__dirname, "..", "build-staging", "ms-playwright");
}

function childEnv() {
  const env = {
    ...process.env,
    QUIP_MANAGED: "1",
    QUIP_DATA_DIR: app.getPath("userData"),
  };

  // Chromium ships inside the app; without this Playwright looks in
  // ~/.cache/ms-playwright, which does not exist on a user's machine.
  const browsers = browsersPath();
  if (fs.existsSync(browsers)) env.PLAYWRIGHT_BROWSERS_PATH = browsers;

  const key = secrets.getOpenRouterKey();
  if (key) env.QUIP_OPENROUTER_API_KEY = key;
  else delete env.QUIP_OPENROUTER_API_KEY;

  return env;
}

function start() {
  if (startPromise) return startPromise;

  const entry = servicePath();
  if (!fs.existsSync(entry)) {
    return Promise.reject(
      new Error(`Service build not found at ${entry}. Run "npm run build" first.`)
    );
  }

  startPromise = new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Service did not report ready within 20s"));
    }, START_TIMEOUT_MS);

    child = utilityProcess.fork(entry, [], {
      serviceName: "quip-service",
      stdio: "pipe",
      env: childEnv(),
      cwd: path.dirname(path.dirname(entry)),
    });

    child.stdout?.on("data", (d) => log("out", d));
    child.stderr?.on("data", (d) => log("err", d));

    child.on("message", (message) => {
      if (message?.type !== "ready") return;
      apiBase = `http://127.0.0.1:${message.port}`;
      restarts = 0;
      onStateChange({ state: "running", apiBase });
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(apiBase);
    });

    child.on("exit", (code) => {
      child = null;
      apiBase = null;
      startPromise = null;

      if (stopping) return;

      if (restarts < MAX_RESTARTS) {
        restarts += 1;
        const delay = 1000 * restarts; // linear backoff
        onStateChange({ state: "restarting", attempt: restarts, code });
        setTimeout(() => {
          start().catch((err) => onStateChange({ state: "failed", error: err.message }));
        }, delay);
      } else {
        onStateChange({ state: "dead", code });
      }

      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Service exited with code ${code} before becoming ready`));
      }
    });
  });

  return startPromise;
}

async function stop() {
  stopping = true;
  if (!child) return;

  const exited = new Promise((resolve) => {
    const c = child;
    if (!c) return resolve();
    c.once("exit", () => resolve());
    // Give Chromium time to close cleanly, then stop waiting.
    setTimeout(resolve, 6000);
  });

  try {
    child.postMessage({ type: "shutdown" });
  } catch {
    /* already gone */
  }

  await exited;

  try {
    child?.kill();
  } catch {
    /* already gone */
  }
  child = null;
}

/** Pushes a new API key into the running service without a restart. */
function pushApiKey(key) {
  try {
    child?.postMessage({ type: "api-key", apiKey: key || null });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  start,
  stop,
  pushApiKey,
  getApiBase: () => apiBase,
  isRunning: () => !!child && !!apiBase,
  onStateChange: (fn) => {
    onStateChange = fn;
  },
};
