"use strict";

const { contextBridge, ipcRenderer } = require("electron");

/**
 * The only bridge between the renderer and Node. Everything is an explicit
 * invoke; the renderer never sees ipcRenderer, fs or the API key itself.
 */
contextBridge.exposeInMainWorld("quip", {
  isDesktop: true,
  platform: process.platform,

  apiBase: () => ipcRenderer.invoke("quip:api-base"),
  serviceState: () => ipcRenderer.invoke("quip:service-state"),
  restartService: () => ipcRenderer.invoke("quip:restart-service"),

  // Reads state only - the key is write-only from the renderer's point of view.
  secretState: () => ipcRenderer.invoke("quip:secret-state"),
  setApiKey: (key) => ipcRenderer.invoke("quip:set-api-key", key),

  openExternal: (url) => ipcRenderer.invoke("quip:open-external", url),
  openDataDir: () => ipcRenderer.invoke("quip:open-data-dir"),

  onServiceState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("quip:service-state", listener);
    return () => ipcRenderer.removeListener("quip:service-state", listener);
  },
});
