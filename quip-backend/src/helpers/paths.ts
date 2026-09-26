import fs from "fs";
import path from "path";

/**
 * All writable state lives under one root.
 *
 * QUIP_DATA_DIR is injected by the desktop supervisor (app.getPath("userData")),
 * because the installed app directory is read-only and process.cwd() is whatever
 * directory the shortcut happened to launch from. It falls back to cwd so the
 * service stays runnable standalone (`npm start`) for debugging.
 */
const DATA_DIR = process.env.QUIP_DATA_DIR
  ? path.resolve(process.env.QUIP_DATA_DIR)
  : process.cwd();

/** Joins onto the data dir and makes sure the parent directory exists. */
export function dataPath(...parts: string[]): string {
  const p = path.join(DATA_DIR, ...parts);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

/** Joins onto the data dir and makes sure the directory itself exists. */
export function dataDir(...parts: string[]): string {
  const p = path.join(DATA_DIR, ...parts);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

export const dataRoot = () => DATA_DIR;
export const storageStatePath = () => dataPath("storage-state.json");
export const transcriptsRoot = () => dataDir("transcripts");
export const logsRoot = () => dataDir("logs");
export const settingsPath = () => dataPath("settings.json");
