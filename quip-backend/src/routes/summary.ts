import { Router } from "express";
import {summaryService} from "../services/google_meet_bot/summary_service";
import {createReport} from "../controllers/summary_controller";
import fs from "fs";
import {getTranscriptsFilePath} from "../helpers/captionsFile";
import path from "path";


const summaryrouter = Router();

    summaryrouter.get("/summarize", async (req, res) => {
        const ret = await summaryService();

        if (ret.size <= 0){
            return res.status(400).json({success: false, message: "No meeting transcript found"});
        }
        return res.status(200).json(ret);
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
        }catch (e) {
            return res.status(500).json({
                error: "Failed to generate report"
            });
        }
    })

    summaryrouter.get('/transcript', async (req, res) => {
        const footpath = getTranscriptsFilePath()
        const transcriptPath = path.join(footpath, "transcription.txt")
        const transcript = fs.readFileSync(transcriptPath, "utf8");
        return res.status(200).json({transcript});
    })


export default summaryrouter;