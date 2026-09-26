/**
 * Stages the service into build-staging/service as a self-contained,
 * production-only tree: dist/ plus a node_modules installed from the lockfile
 * with --omit=dev.
 *
 * Copying quip-backend/node_modules directly would drag typescript, tsx and the
 * @types packages into the installer, so it gets its own clean install instead.
 * Browser download is skipped here - Chromium is staged separately by
 * stage-browsers.mjs and shared by every build.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const backend = path.resolve("quip-backend");

/**
 * Note the "app" wrapper. electron-builder refuses to copy a directory named
 * exactly "node_modules" at the root of an extraResources entry
 * (app-builder-lib/out/util/filter.js: `if (relative === "node_modules") return
 * false`), and no filter pattern overrides it. Nesting one level makes the
 * relative path "app/node_modules", which copies fine, and Node's resolver still
 * finds it by walking up from app/dist/index.js.
 */
const dest = path.resolve("build-staging/service/app");

if (!existsSync(path.join(backend, "dist", "index.js"))) {
  console.error('[stage:service] quip-backend/dist is missing - run "npm run build" first');
  process.exit(1);
}

rmSync(path.resolve("build-staging/service"), { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

console.log(`[stage:service] destination : ${dest}`);

cpSync(path.join(backend, "dist"), path.join(dest, "dist"), { recursive: true });
cpSync(path.join(backend, "package.json"), path.join(dest, "package.json"));
cpSync(path.join(backend, "package-lock.json"), path.join(dest, "package-lock.json"));

console.log("[stage:service] installing production dependencies...");
execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--omit=dev"], {
  cwd: dest,
  stdio: "inherit",
  env: {
    ...process.env,
    // Chromium comes from build-staging/ms-playwright, not from this install.
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  },
});

console.log("[stage:service] done");
