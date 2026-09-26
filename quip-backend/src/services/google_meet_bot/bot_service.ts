import {
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import fs from "fs";
import { SELECTORS } from "../../helpers/selectors";
import Logger from "../../helpers/logger";
import path from 'path'
import {setupRootFilePath , getTranscriptsFilePath} from "../../helpers/captionsFile"
import { storageStatePath } from "../../helpers/paths";
import { getBrowser } from "./browser";

class MeetBot {
  private logger = new Logger("MeetBot");
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  page: Page | null = null;
  meetUrl: string = "";
  captionsBuffer: string = "";
  saveInterval: any = null;
  intervalTime: number = 30000;
  captionsFilePath: string = "";

  async init() {
    try {
      this.logger.info("init", "Acquiring Chromium...");
      this.browser = await getBrowser();

      const statePath = storageStatePath();
      this.logger.info("init", `Reading storage state from ${statePath}`);
      if (!fs.existsSync(statePath)) {
        throw new Error("Not signed in to Google yet - run the login step first");
      }
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      if (!state.cookies) throw new Error("No cookies found in storage state");

      this.logger.info("init", "Creating browser context with storage state");
      this.context = await this.browser.newContext({
        storageState: statePath,
      });

      this.logger.info(
        "init",
        "Granting permissions: microphone, camera, notifications"
      );
      await this.context.grantPermissions([
        "microphone",
        "camera",
        "notifications",
      ]);

      this.logger.info("init", "Creating new page and adding cookies");
      this.page = await this.context.newPage();
      await this.context.addCookies(state.cookies);

      this.logger.info("init", "Browser and context initialized successfully");

      return true;
    } catch (err) {
      this.logger.error(
        "init",
        "Failed to launch Chromium or initialize context",
        err
      );
      return false;
    }
  }

  async setupObservers() {
    try {
      if (!this.page) throw new Error("Page not initialized.");
      const filePath = getTranscriptsFilePath()
      const properPath = path.join(filePath , "transcription.txt")
      this.logger.info(
        "setupObservers",
        `Captions file path: ${properPath}`
      )
      if (!fs.existsSync(properPath)) {
        fs.writeFileSync(properPath, "");
        this.logger.info("setupObservers", "Captions file not found - creating new one")
      }
      this.captionsFilePath = properPath
      this.logger.info(
        "setupObservers",
        "Exposing __pushCaption function to page"
      );
      await this.page.exposeFunction("__pushCaption", (captions: string) => {
        this.logger.info("__pushCaption", "Received captions", {
          length: captions.length,
        });
        this.captionsBuffer = captions;
      });

      this.logger.info(
        "setupObservers",
        "Exposing __pushPeopleCount function to page"
      );
      await this.page.exposeFunction(
        "__pushPeopleCount",
        async (label: string) => {
          const match: any = label.match(/People\s*-\s*(\d+)\s*joined/i);
          const count = match ? parseInt(match[1], 10) : null;

          if (count !== null && count <= 1) {
            this.logger.warn(
              "__pushPeopleCount",
              `People count: ${count} - Leaving meeting`
            );
            await this.leaveMeet();
          }
        }
      );

      this.logger.info(
        "setupObservers",
        `Starting auto-save interval (${this.intervalTime}ms)`
      );
      this.saveInterval = setInterval(() => {
        if (this.captionsBuffer.length > 0) {
          fs.appendFileSync(this.captionsFilePath, this.captionsBuffer + "\n");
          this.logger.info("setupObservers", "Captions auto-saved to file");
          this.captionsBuffer = "";
        }
      }, this.intervalTime);

      this.logger.info(
        "setupObservers",
        "Injecting MutationObserver into page"
      );
      const elementsFound = await this.page.evaluate(
        (sel: any) => {
          const region = document.querySelector(sel.region);
          const peopleButton = document.querySelector(sel.people);

          console.log(`[DEBUG] Captions region found: ${!!region}`);
          console.log(`[DEBUG] People button found: ${!!peopleButton}`);

          if (!region) {
            console.error(`[ERROR] Captions region not found with selector: ${sel.region}`);
            return { success: false, reason: "Captions region not found" };
          }

          const observer = new MutationObserver(() => {
            //@ts-ignore
            window.__pushCaption(region.innerText || "");
            if (peopleButton) {
              //@ts-ignore
              window.__pushPeopleCount(
                peopleButton.getAttribute("aria-label") || ""
              );
            }
          });

          observer.observe(region, {
            childList: true,
            subtree: true,
            characterData: true,
          });

          if (peopleButton) {
            observer.observe(peopleButton, {
              attributes: true,
            });
          } else {
            console.warn(`[WARN] People button not found with selector: ${sel.people} - continuing without it`);
          }

          return { success: true, hasRegion: true, hasPeopleButton: !!peopleButton };
        },
        {
          region: SELECTORS.CAPTIONS_REGION,
          people: SELECTORS.PEOPLE_BUTTON,
        }
      );

      this.logger.info("setupObservers", "Element detection results", elementsFound);

      if (!elementsFound.success) {
        throw new Error(`Failed to setup observers: ${elementsFound.reason}`);
      }

      this.logger.info("setupObservers", "Observers set up successfully");

      return true;
    } catch (err) {
      this.logger.error("setupObservers", "Failed to set up observers", err);
      return false;
    }
  }

  async joinMeeting(meetURL: string) {
    try {
      this.meetUrl = meetURL;
      setupRootFilePath(this.meetUrl)
      if (!this.page) throw new Error("Page not initialized");
      this.logger.info("joinMeeting", `Navigating to meeting URL: ${meetURL}`);
      await this.page.goto(meetURL, { waitUntil: "networkidle" });
      this.logger.info("joinMeeting", "Successfully opened meet URL");

      try {
        this.logger.info("joinMeeting", "Looking for Join button");
        const joinButton = this.page.getByRole(
          SELECTORS.ROLE_JOIN_BUTTON.role,
          SELECTORS.ROLE_JOIN_BUTTON
        );
        await joinButton.first().click();
        this.logger.info("joinMeeting", "Clicked Join button");
      } catch {
        this.logger.error("joinMeeting", "Could not find Join button");
        throw new Error("Could not find Join button ");
      }

      this.logger.info("joinMeeting", "Admitted to meeting");

      this.logger.info("joinMeeting", "Waiting for captions button");
      await this.page.waitForSelector(SELECTORS.TURN_ON_CAPTIONS_BUTTON, {
        state: "visible",
        timeout: 0,
      });

      this.logger.info("joinMeeting", "Checking for 'Got it' button");
      const btnLocator = this.page.getByRole(
        SELECTORS.ROLE_GOT_IT_BUTTON.role,
        { name: SELECTORS.ROLE_GOT_IT_BUTTON.name }
      );
      try {
        await btnLocator.waitFor({ state: "visible", timeout: 5000 });
        await btnLocator.click();
        this.logger.info("joinMeeting", "Clicked 'Got it' button");
      } catch (err) {
        this.logger.debug(
          "joinMeeting",
          "'Got it' button not found, continuing..."
        );
      }

      try {
        this.logger.info("joinMeeting", "Attempting to turn on captions");
        await this.page
          .getByRole(
            SELECTORS.ROLE_TURN_ON_CAPTIONS_BY_ROLE.role,
            SELECTORS.ROLE_TURN_ON_CAPTIONS_BY_ROLE
          )
          .click();
        this.logger.info("joinMeeting", "Captions turned on successfully");
      } catch {
        this.logger.error("joinMeeting", "Could not enable captions");
        throw new Error("Could not enable captions");
      }

      return true;
    } catch (err) {
      this.logger.error("joinMeeting", "Failed to join meeting", err);
      // await this.leaveMeet()
      return false;
    }
  }

  async leaveMeet() {
    try {
      if (!this.page) {
        this.logger.warn(
          "leaveMeet",
          "Page not initialized - cannot leave meeting"
        );
        return;
      }

      this.logger.info("leaveMeet", "Attempting to leave meeting");

      try {
        this.logger.info("leaveMeet", "Checking for 'Got it' button");
        const btn = this.page.getByRole(
          SELECTORS.ROLE_GOT_IT_BUTTON.role,
          SELECTORS.ROLE_GOT_IT_BUTTON
        );

        if (await btn.isVisible()) {
          await btn.click();
          this.logger.info("leaveMeet", "Clicked 'Got it' button");
        } else {
          this.logger.debug(
            "leaveMeet",
            "'Got it' button not visible - skipping"
          );
        }

        this.logger.info("leaveMeet", "Waiting for leave button");
        const leaveBtn = await this.page.waitForSelector(
          SELECTORS.LEAVE_MEETING_BUTTON
        );
        await leaveBtn.click();
        this.logger.info("leaveMeet", "Clicked leave button successfully");
      } catch {
        this.logger.error("leaveMeet", "Leave button not found");
        throw new Error("Leave button not found");
      }

      await this.cleanup();

      return true;
    } catch (err) {
      this.logger.error("leaveMeet", "Error while leaving meeting", err);
      return false;
    }
  }

  async cleanup() {
    this.logger.info("cleanup", "Starting cleanup process...");

    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.logger.info("cleanup", "Cleared auto-save interval");
    }

    if (this.captionsBuffer) {
      fs.appendFileSync(this.captionsFilePath, this.captionsBuffer + "\n");
      this.logger.info("cleanup", "Final captions saved to file");
      this.captionsBuffer = "";
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
      this.logger.info("cleanup", "Browser context closed");
    }

    // The Browser handle is a process-wide singleton reused across meetings;
    // closeBrowser() on service shutdown is what actually kills Chromium.
    this.browser = null;

    this.page = null;

    this.logger.info("cleanup", "Cleanup completed successfully");
  }

  async start(meetURL: string) {
    try {
      this.logger.info("start", "Starting MeetBot...");
      const initStatus = await this.init();
      if(!initStatus){
        this.logger.error("start", "Failed to initialize");
        return false
      }

      const joinRet = await this.joinMeeting(meetURL);
      if (!joinRet) {
        this.logger.error("start", "Failed to join meeting");
        throw new Error("Failed to Join meeting")
      }

      const obsRet = await this.setupObservers();
      if (!obsRet) {
        this.logger.error("start", "Failed to setup observers");
        throw new Error("Failed to setup observers")
      }

      this.logger.info(
        "start",
        `MeetBot successfully joined meeting: ${meetURL}`
      );
      return true;
    } catch (err) {
      this.logger.error("start", "Fatal error occurred during start", err);
      await this.leaveMeet();
      return false;
    }
  }
}

export default MeetBot;
