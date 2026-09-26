import { Router } from "express";
import { summaryService } from "../services/google_meet_bot/summary_service";
import { createReport } from "../controllers/summary_controller";
import fs from "fs";
import { NoTranscriptError, resolveTranscriptsFilePath } from "../helpers/captionsFile";
import path from "path";
import Logger from "../helpers/logger";
import { MissingApiKeyError } from "../helpers/config";

const logger = new Logger("SummaryRouter");
const summaryrouter = Router();

summaryrouter.get("/summarize", async (req, res) => {
    try {
        const ret = await summaryService();

        if (!ret || Object.keys(ret).length === 0) {
            return res.status(400).json({success: false, message: "No meeting transcript found"});
        }
        return res.status(200).json(ret);
    } catch (err) {
        if (err instanceof NoTranscriptError) {
            logger.warn("GET /summarize", err.message);
            return res.status(400).json({success: false, code: "NO_TRANSCRIPT", message: err.message});
        }
        // 428: the user has to do something (add their key) before this can work.
        if (err instanceof MissingApiKeyError) {
            logger.warn("GET /summarize", err.message);
            return res.status(428).json({success: false, code: "NO_API_KEY", message: err.message});
        }
        logger.error("GET /summarize", "Failed to summarize", err);
        const message = err instanceof Error ? err.message : "Failed to summarize meeting";
        return res.status(500).json({success: false, message});
    }
})

summaryrouter.get("/report", async (req, res) => {
    try {
        const pdfBuffer = await createReport();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "inline; filename=report.pdf"
        );

        return res.send(pdfBuffer);
    } catch (e) {
        logger.error("GET /report", "Failed to generate report", e);
        return res.status(500).json({
            error: "Failed to generate report"
        });
    }
})

summaryrouter.get('/transcript', async (req, res) => {
    try {
        const footpath = resolveTranscriptsFilePath()
        const transcriptPath = path.join(footpath, "transcription.txt")
        const transcript = fs.readFileSync(transcriptPath, "utf8");
        return res.status(200).json({transcript});
    } catch (err) {
        logger.error("GET /transcript", "Failed to read transcript", err);
        return res.status(404).json({success: false, message: "No transcript available yet"});
    }
})

export default summaryrouter;
