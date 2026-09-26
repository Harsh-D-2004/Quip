import fs from "fs";
import path from "path";
import { transcriptsRoot } from "./paths";

/** No meeting has been recorded yet (or nothing survives on disk). */
export class NoTranscriptError extends Error {
    constructor() {
        super("No meeting transcript found - join a meeting first");
        this.name = "NoTranscriptError";
    }
}

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
            transcriptsRoot(),
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
        throw new NoTranscriptError();
    }
    return transcriptFilePath;
}

/**
 * Restores the "current meeting" pointer to the most recently written transcript
 * folder. The renderer can ask for a summary after the service has been restarted
 * (the supervisor respawns it on crash), and without this every /ai route would
 * fail with "Captions file not initialized".
 */
export function restoreLatestTranscriptPath(): string | null {
    try {
        const root = transcriptsRoot();
        const candidates = fs
            .readdirSync(root, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => {
                const dir = path.join(root, e.name);
                return { dir, mtime: fs.statSync(dir).mtimeMs };
            })
            .sort((a, b) => b.mtime - a.mtime);

        const latest = candidates[0];
        if (!latest) return null;

        transcriptFilePath = latest.dir;
        return transcriptFilePath;
    } catch {
        return null;
    }
}

/** Like getTranscriptsFilePath(), but falls back to the newest folder on disk. */
export function resolveTranscriptsFilePath(): string {
    if (transcriptFilePath) return transcriptFilePath;
    const restored = restoreLatestTranscriptPath();
    if (!restored) throw new NoTranscriptError();
    return restored;
}
