import BotProfile from "../services/google_meet_bot/bot_login";
import Logger from "../helpers/logger";

class BotProfileController {
  private logger = new Logger("BotProfileController");
  botProfile: BotProfile;

  constructor() {
    this.logger.info("constructor", "Initializing BotProfileController");
    this.botProfile = new BotProfile();
  }

  async login() {
    this.logger.info("login", "Starting login process");
    const ret = await this.botProfile.login();
    if (!ret) {
      this.logger.error("login", "Login failed");
      return false;
    }
    this.logger.info("login", "Login successful");
    return true;
  }
}

export default BotProfileController;
