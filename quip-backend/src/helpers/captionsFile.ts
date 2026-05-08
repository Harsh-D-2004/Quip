import fs from "fs";
import path from "path";

let transcriptFilePath: string | null = null;

function sanitizeMeetUrl(meetUrl: string): string {
    return meetUrl
        .replace(/^https?:\/\//, "")
        .replace(/[<>:"/\\|?*]/g, "_");
}

export function setupRootFilePath(meetUrl: string): string {
    try {

        const safeMeetDir = sanitizeMeetUrl(meetUrl);

        const filePath = path.join(
            process.cwd(),
            "transcripts",
            safeMeetDir
        );

        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, {recursive: true});
        }

        transcriptFilePath = filePath;
        return transcriptFilePath;
    }catch (err){
        console.log(err);
        throw new Error("Failed to create transcript directory");
    }
}

export function getTranscriptsFilePath(): string {
    if (!transcriptFilePath) {
        throw new Error("Captions file not initialized");
    }
    return transcriptFilePath;
}
