"use strict";

const fs = require("fs");
const path = require("path");
const { app, safeStorage } = require("electron");

/**
 * The user's own OpenRouter API key, stored per-user under userData.
 *
 * Encrypted with Electron's safeStorage, which is DPAPI on Windows, the Keychain
 * on macOS and libsecret/kwallet on Linux. On a Linux box with no keyring at all
 * safeStorage reports encryption unavailable; we still persist (0600) but mark
 * the record so the UI can be honest about it, rather than silently pretending
 * the key is protected.
 *
 * Nothing is ever written into the application bundle, so nothing ships in the
 * installer - which is the whole point (see RESTRUCTURE_PLAN.md B8).
 */

const FILE = () => path.join(app.getPath("userData"), "secrets.json");

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE(), "utf8"));
  } catch {
    return {};
  }
}

function write(record) {
  const file = FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(record, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* best effort on filesystems without POSIX modes */
  }
}

function encryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function getOpenRouterKey() {
  const record = read();
  const entry = record.openRouterApiKey;
  if (!entry) return null;

  if (entry.encrypted) {
    if (!encryptionAvailable()) return null;
    try {
      return safeStorage.decryptString(Buffer.from(entry.value, "base64")) || null;
    } catch {
      return null;
    }
  }
  return entry.value || null;
}

function setOpenRouterKey(key) {
  const record = read();

  if (!key) {
    delete record.openRouterApiKey;
    write(record);
    return { stored: false, encrypted: false };
  }

  const encrypted = encryptionAvailable();
  record.openRouterApiKey = encrypted
    ? { encrypted: true, value: safeStorage.encryptString(key).toString("base64") }
    : { encrypted: false, value: key };

  write(record);
  return { stored: true, encrypted };
}

module.exports = { getOpenRouterKey, setOpenRouterKey, encryptionAvailable };
