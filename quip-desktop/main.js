"use strict";

const path = require("path");
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const supervisor = require("./supervisor");
const secrets = require("./secrets");

// Two copies of the app must not fight over the same userData directory.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const DEV_SERVER_URL = process.env.QUIP_DEV_SERVER_URL || "http://localhost:8080";

/**
 * Electron 39's Wayland/Ozone backend segfaults during startup on current Ubuntu
 * (26.04, kernel 7.x), reproducibly and before the first window appears.
 * XWayland is fine, so X11 is the default on Linux.
 *
 * Ozone picks its backend before the main script runs, so appendSwitch() and the
 * ELECTRON_OZONE_PLATFORM_HINT env var are both too late - all three were
 * verified to still crash. Only a real command-line argument works. The installed
 * .desktop entry carries it (linux.executableArgs), and this relaunch covers the
 * case where someone runs the binary directly.
 *
 * Set QUIP_OZONE_PLATFORM=wayland to opt back in once upstream is fixed.
 */
if (process.platform === "linux") {
  const requested = process.env.QUIP_OZONE_PLATFORM || "x11";
  const alreadySet = process.argv.some((a) => a.startsWith("--ozone-platform"));

  if (!alreadySet && requested !== "default") {
    app.relaunch({ args: [...process.argv.slice(1), `--ozone-platform=${requested}`] });
    app.exit(0);
  }
}

let mainWindow = null;
let quitting = false;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

supervisor.onStateChange((state) => sendToRenderer("quip:service-state", state));

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#0b0b0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Meet links and OpenRouter's site must open in the user's real browser, not
  // inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  } else {
    await mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC surface. Deliberately small: an API base, the service state, and the key.
// ---------------------------------------------------------------------------

ipcMain.handle("quip:api-base", async () => {
  if (supervisor.getApiBase()) return supervisor.getApiBase();
  return supervisor.start();
});

ipcMain.handle("quip:service-state", () => ({
  state: supervisor.isRunning() ? "running" : "starting",
  apiBase: supervisor.getApiBase(),
}));

ipcMain.handle("quip:restart-service", async () => {
  await supervisor.stop();
  return supervisor.start();
});

ipcMain.handle("quip:secret-state", () => ({
  hasKey: !!secrets.getOpenRouterKey(),
  encrypted: secrets.encryptionAvailable(),
}));

/**
 * Validation lives in the service (one implementation, reachable in dev too);
 * persistence lives here, because safeStorage is main-process only.
 */
ipcMain.handle("quip:set-api-key", async (_event, key) => {
  const trimmed = typeof key === "string" ? key.trim() : "";

  if (!trimmed) {
    secrets.setOpenRouterKey(null);
    supervisor.pushApiKey(null);
    return { success: true, cleared: true };
  }

  const base = supervisor.getApiBase() || (await supervisor.start());

  let check;
  try {
    const res = await fetch(`${base}/settings/api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: trimmed }),
    });
    check = await res.json();
  } catch (err) {
    return { success: false, message: `Could not reach the Quip service: ${err.message}` };
  }

  if (!check?.success) {
    return { success: false, message: check?.message || "Key was rejected" };
  }

  const { encrypted } = secrets.setOpenRouterKey(trimmed);
  supervisor.pushApiKey(trimmed);

  return {
    success: true,
    persisted: true,
    encrypted,
    label: check.label,
    limitRemaining: check.limitRemaining,
  };
});

ipcMain.handle("quip:open-external", (_event, url) => {
  if (typeof url === "string" && /^https:\/\//.test(url)) shell.openExternal(url);
});

ipcMain.handle("quip:open-data-dir", () => shell.openPath(app.getPath("userData")));

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  // The window comes up either way: a dead service is a state the UI reports,
  // not a reason to show the user nothing at all.
  supervisor.start().catch((err) => {
    console.error("[main] service failed to start:", err.message);
    sendToRenderer("quip:service-state", { state: "failed", error: err.message });
    dialog.showErrorBox(
      "Quip could not start its background service",
      `${err.message}\n\nThe window will open, but recording and summaries will not work.`
    );
  });

  await createWindow();
});

app.on("before-quit", async (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  try {
    await supervisor.stop();
  } catch (err) {
    console.error("[main] service shutdown error:", err);
  }
  app.exit(0);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
