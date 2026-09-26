import { chromium, type Browser } from "playwright";
import Logger from "../../helpers/logger";

const logger = new Logger("Browser");

let browser: Browser | null = null;

/**
 * One Chromium per service process, launched lazily.
 *
 * Previously this lived in a separate terminal (src/local_login_server/bot.ts)
 * and was reached over CDP on port 9223. The service owns the launch now, so
 * both the extra process and the hardcoded port are gone.
 */
export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;

  // Escape hatch: attach to an external browser (e.g. a remote Steel session).
  const cdp = process.env.QUIP_CDP_URL;

  if (cdp) {
    logger.info("getBrowser", `Connecting over CDP: ${cdp}`);
    browser = await chromium.connectOverCDP(cdp);
  } else {
    logger.info("getBrowser", "Launching bundled Chromium (headless)");
    browser = await chromium.launch({
      // channel "chromium" runs the full Chromium build in headless mode rather
      // than chromium-headless-shell. The login flow needs the full build anyway
      // (it is headed), so this lets the installer ship one browser instead of
      // two - about 260 MB saved.
      channel: "chromium",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--use-angle=gl",
        "--use-gl=swiftshader",
        "--enable-webgl",
      ],
    });
  }

  browser.on("disconnected", () => {
    logger.warn("getBrowser", "Chromium disconnected");
    browser = null;
  });

  return browser;
}

/** Called on shutdown so no orphan Chromium survives the app. */
export async function closeBrowser(): Promise<void> {
  if (!browser) return;
  logger.info("closeBrowser", "Closing Chromium");
  try {
    await browser.close();
  } catch (err) {
    logger.warn("closeBrowser", "Chromium did not close cleanly", err);
  } finally {
    browser = null;
  }
}
