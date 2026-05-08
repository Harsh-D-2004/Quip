
import fs from "fs";
import MeetBot from "../services/google_meet_bot/bot_service";
import Logger from "../helpers/logger";
import {getTranscriptsFilePath} from "../helpers/captionsFile"
import path from "path";

class GoogleMeetBotController {
  private logger = new Logger("GoogleMeetBotController");
  meetBot: MeetBot;

  constructor() {
    this.logger.info("constructor", "Initializing GoogleMeetBotController");
    this.meetBot = new MeetBot();
  }

  async joinMeeting(meetURL: string) {
    this.logger.info("joinMeeting", "Creating data folder");
    this.logger.info("joinMeeting", `Request to join meeting: ${meetURL}`);
    const ret = await this.meetBot.start(meetURL);
    if (ret) {
      this.logger.info("joinMeeting", "Successfully joined meeting");
    } else {
      this.logger.error("joinMeeting", "Failed to join meeting");
    }
    return ret;
  }

  async leaveMeeting() {
    this.logger.info("leaveMeeting", "Request to leave meeting");
    const ret = await this.meetBot.leaveMeet();
    if (ret) {
      this.logger.info("leaveMeeting", "Successfully left meeting");
    } else {
      this.logger.error("leaveMeeting", "Failed to leave meeting");
    }
    return ret;
  }

  async getCaptions() {
    this.logger.info("getCaptions", "Request to retrieve captions");
    try {
      const filePath = getTranscriptsFilePath()
      const properPath = path.join(filePath , "transcription.txt")
      const ret = fs.readFileSync(properPath, "utf8");
      this.logger.info("getCaptions", `Retrieved captions (${ret.length} characters)`);
      return ret;
    } catch (err) {
      this.logger.error("getCaptions", "Failed to read captions file", err);
      throw err;
    }
  }
}

export default GoogleMeetBotController;
