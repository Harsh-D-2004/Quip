import {Router} from "express";
import GoogleMeetBotController from "../controllers/google_meet_bot_controleer";
import Logger from "../helpers/logger";

const logger = new Logger("GoogleBotRouter");
const googleBotrouter = Router();

const googleBotController = new GoogleMeetBotController();

googleBotrouter.post("/join", async (req, res) => {
  logger.info("POST /join", `Received request to join meeting: ${req.body.meetURL}`);
  const ret = await googleBotController.joinMeeting(req.body.meetURL);
  if(ret) {
    logger.info("POST /join", "Meeting joined successfully");
    res.status(200).json({success: true, message: "Meet Bot started successfully"});
  } else {
    logger.error("POST /join", "Failed to join meeting");
    res.status(500).json({success: false, message: "Meet Bot failed to start"});
  }
});

googleBotrouter.post("/leave", async (req, res) => {
  logger.info("POST /leave", "Received request to leave meeting");
  const ret = await googleBotController.leaveMeeting();
  if(ret) {
    logger.info("POST /leave", "Meeting left successfully");
    res.status(200).json({success: true, message: "Meet Bot stopped successfully"});
  } else {
    logger.error("POST /leave", "Failed to leave meeting");
    res.status(500).json({success: false, message: "Meet Bot failed to stop"});
  }
});

googleBotrouter.get("/captions", async (req, res) => {
  logger.info("GET /captions", "Received request to get captions");
  try {
    const ret = await googleBotController.getCaptions();
    logger.info("GET /captions", "Captions retrieved successfully");
    res.send(ret).status(200);
  } catch (err) {
    logger.error("GET /captions", "Failed to get captions", err);
    res.status(500).json({success: false, message: "Failed to retrieve captions"});
  }
});

export default googleBotrouter;