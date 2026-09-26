/**
 * Stages Playwright's Chromium into build-staging/ms-playwright so
 * electron-builder can ship it inside the .deb.
 *
 * Without this the app looks for Chromium in ~/.cache/ms-playwright, which does
 * not exist on a user's machine, and Playwright fails with "Executable doesn't
 * exist". Chromium builds are platform-specific, so this must run on Linux x64 -
 * the same platform the .deb targets.
 *
 * The Playwright CLI version comes from quip-backend's installed copy, so the
 * staged browser build always matches the library that will drive it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const dest = path.resolve("build-staging/ms-playwright");

/**
 * Only the full chromium build is kept. Both the bot and the headed login window
 * use it (see quip-backend/src/services/google_meet_bot/browser.ts), and nothing
 * records video, so headless-shell and ffmpeg are ~265 MB of dead weight.
 */
const PRUNE = [/^chromium_headless_shell-/, /^ffmpeg-/];

if (process.platform !== "linux") {
  console.error(`[stage:browsers] this project packages for Linux only; host is ${process.platform}`);
  process.exit(1);
}

const cliPath = path.resolve("quip-backend/node_modules/playwright/cli.js");
const pkgPath = path.resolve("quip-backend/node_modules/playwright/package.json");
if (!existsSync(pkgPath)) {
  console.error("[stage:browsers] quip-backend/node_modules is missing - run npm install first");
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));

console.log(`[stage:browsers] playwright ${version}`);
console.log(`[stage:browsers] destination: ${dest}`);

mkdirSync(dest, { recursive: true });

execFileSync(process.execPath, [cliPath, "install", "chromium"], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: dest },
});

for (const entry of readdirSync(dest)) {
  if (PRUNE.some((re) => re.test(entry))) {
    rmSync(path.join(dest, entry), { recursive: true, force: true });
    console.log(`[stage:browsers] pruned ${entry}`);
  }
}

const staged = readdirSync(dest).filter((e) => !e.startsWith("."));
if (!staged.some((e) => /^chromium-/.test(e))) {
  console.error("[stage:browsers] no chromium build was staged - aborting");
  process.exit(1);
}

console.log(`[stage:browsers] staged: ${staged.join(", ")}`);
