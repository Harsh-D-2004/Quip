import {createSummaryReport} from "../services/google_meet_bot/summary_service";
import fs from "fs";

export async function createReport() : Promise<any> {

    const path = await createSummaryReport()

    if(path == null) throw new Error(
        `No report found at path ${path}`
    )

    return fs.readFileSync(path);
}