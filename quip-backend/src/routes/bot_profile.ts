import { Router } from "express";
import BotProfileController from "../controllers/bot_profile";
import Logger from "../helpers/logger";

const logger = new Logger("BotProfileRouter");
const botProfilerouter = Router();

botProfilerouter.post("/login", async (req, res) => {
  logger.info("POST /login", "Received login request");
  const botProfileController = new BotProfileController();
  const ret = await botProfileController.login();
  logger.info("POST /login", `Login status: ${ret ? "success" : "failed"}`);
  if (!ret) {
    logger.error("POST /login", "Login failed");
    return res.status(400).json({ success: false, message: "Login failed" });
  }
  logger.info("POST /login", "Login successful");
  return res.status(200).json({ success: true, message: "Login successful" });
});

export default botProfilerouter;
