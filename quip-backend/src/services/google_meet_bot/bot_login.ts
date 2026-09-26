import { chromium } from "playwright";
import fs from "fs";
import Logger from "../../helpers/logger";
import { storageStatePath } from "../../helpers/paths";

class BotProfile {
  private logger = new Logger("BotProfile");
  userAgent: string = "";
  storage_path: string = storageStatePath();

  constructor() {
    this.logger.info("constructor", `Removing existing storage state file: ${this.storage_path}`);
    fs.rm(this.storage_path, { force: true }, (err) => {
      if (err) {
        this.logger.warn("constructor", "Failed to remove storage state file", err);
      } else {
        this.logger.info("constructor", "Storage state file removed successfully");
      }
    });
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    this.logger.info("constructor", "BotProfile initialized with custom user agent");
  }

  async login() {
    this.logger.info("login", "Launching browser for Google login");
    const browser = await chromium.launch({
      channel: "chromium",
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--window-size=1280,800",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--ignore-certificate-errors",
      ],
    });

    this.logger.info("login", "Creating browser context with custom settings");
    const context = await browser.newContext({
      viewport: null,
      userAgent: this.userAgent,
      locale: "en-US",
      timezoneId: "Asia/Kolkata",
    });

    this.logger.info("login", "Browser and context initialized successfully");

    const page = await context.newPage();
    try {
      this.logger.info("login", "Navigating to Google login page");
      await page.goto("https://accounts.google.com", {
        waitUntil: "domcontentloaded",
      });
      this.logger.info("login", "Google login page opened successfully");
    } catch (err) {
      this.logger.error("login", "Failed to open Google login page", err);
    }

    try {
      this.logger.info("login", "Waiting for user to complete login (close page when done)...");
      await new Promise<Error | boolean>((resolve, reject) => {
        // If the user closes the whole window (or Chromium dies) the page
        // "close" event can be missed - without this the HTTP request hangs.
        browser.once("disconnected", () => resolve(false));
        page.once("close", async () => {
          this.logger.info("login", "Page closed by user - saving authentication state");
          try {
            await context.storageState({
              path: this.storage_path,
            });
            this.logger.info("login", `Cookies and storage state saved to: ${this.storage_path}`);
            resolve(true);
          } catch (err) {
            this.logger.error("login", "Failed to save cookies and storage state", err);
            reject(false);
          }
        });
      });
    } catch (err) {
      this.logger.error("login", "Error while saving cookies", err);
      return false;
    }

    this.logger.info("login", "Closing browser");
    await browser.close();
    this.logger.info("login", "Login completed successfully");
    return true;
  }
}

export default BotProfile;
