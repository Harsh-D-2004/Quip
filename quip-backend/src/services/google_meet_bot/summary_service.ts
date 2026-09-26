import fs from "fs";
import { OpenRouter } from "@openrouter/sdk";
import Logger from "../../helpers/logger";
import { resolveTranscriptsFilePath } from "../../helpers/captionsFile";
import path from "path";
import PDFDocument from "pdfkit";
import { getSettings, requireApiKey } from "../../helpers/config";

let logger: any = new Logger("SummaryService");

/**
 * Built per call rather than at import time: the key arrives from the desktop
 * shell after this module has loaded, and the user can change it at any point.
 */
function client(): OpenRouter {
  return new OpenRouter({ apiKey: requireApiKey() });
}

function systemPrompt(context: string): string {
  return `
You are an expert meeting summarization assistant.

You will receive a raw meeting transcript where:
- Each speaker is identified by their name on a separate line
- The following lines contain that speaker’s spoken transcription
- The transcript may include repetitions, audio checks, filler words, or noise

Your tasks:
1. Produce a concise and accurate meeting summary.
2. Extract clear key discussion points (ignore greetings, mic checks, and noise).
3. Identify all unique participants and summarize what each person spoke about.
4. Count the total number of distinct participants.
5. Add notes if the meeting is unclear, very short, or mostly audio checks.

Important rules:
- Ignore repeated words, filler phrases, and microphone testing.
- Do NOT hallucinate discussion topics that are not present.
- Be concise, professional, and factual.
- Do NOT include explanations or extra text outside JSON.
- Return ONLY valid JSON.
- Do NOT use markdown.
- Do NOT wrap in \`\`\`json.
- Do NOT include explanations.

Output format:
{
    "summary": "",
    "key_points": []
    "participants": [{"name" : "" , "summary" : ""}]
    "participant_count": 0
}

Transcript:
${context}
`;
}

export interface NormalisedSummary {
  meetingSummary: string;
  keyDiscussionPoints: string[];
  participantContributions: Record<string, string>;
  participantCount: number;
}

/**
 * summary.json has been written in two shapes over time: snake_case (what the
 * model returns) and camelCase (older files). The PDF generator reads whichever
 * it is handed, so normalise here rather than at every call site.
 */
export function normaliseSummary(raw: any): NormalisedSummary {
  const contributions: Record<string, string> = {};

  if (Array.isArray(raw?.participants)) {
    for (const p of raw.participants) {
      if (p && typeof p === "object" && typeof p.name === "string") {
        contributions[p.name] = typeof p.summary === "string" ? p.summary : "";
      }
    }
  } else if (raw?.participants && typeof raw.participants === "object") {
    Object.assign(contributions, raw.participants);
  } else if (raw?.participantContributions && typeof raw.participantContributions === "object") {
    Object.assign(contributions, raw.participantContributions);
  }

  const count = Number(raw?.participant_count ?? raw?.participantCount);

  return {
    meetingSummary: raw?.summary ?? raw?.meetingSummary ?? "",
    keyDiscussionPoints: raw?.key_points ?? raw?.keyDiscussionPoints ?? [],
    participantContributions: contributions,
    participantCount: Number.isFinite(count) ? count : Object.keys(contributions).length,
  };
}

function extractJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found");
  return match[0];
}

export async function summaryService(): Promise<any> {
  const footpath = resolveTranscriptsFilePath();
  const contextPath = path.join(footpath, "transcription.txt");
  let text = fs.readFileSync(contextPath, "utf8");
  logger.info("summaryService", "Captions file read successfully");

  const prompt = systemPrompt(text);
  logger.info("summaryService", "Prompt generated successfully");

  const completion = await client().chat.send({
    model: getSettings().model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "MeetingResponse",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description:
                "Brief high-level summary of the meeting in 5 to 6 lines.",
            },
            key_points: {
              type: "array",
              description:
                "List of the most important discussion points, decisions, or outcomes from the meeting.",
              items: {
                type: "string",
                description:
                  "A single concise key point written as a short sentence.",
              },
            },
            participants: {
              type: "array",
              description:
                "Distinct participants who actively spoke or were mentioned in the meeting.",
              items: {
                type: "object",
                description: "Information about one meeting participant.",
                properties: {
                  name: {
                    type: "string",
                    description: "Full name of the participant.",
                  },
                  summary: {
                    type: "string",
                    description:
                      "What this participant spoke about, in one or two sentences.",
                  },
                },
                required: ["name", "summary"],
                additionalProperties: false,
              },
            },
            participant_count: {
              type: "number",
              description: "Total number of distinct participants.",
            },
          },
          required: [
            "summary",
            "key_points",
            "participants",
            "participant_count",
          ],
          additionalProperties: false,
        },
      },
    },
    plugins: [{ id: "response-healing" }],
    stream: false,
  });

  logger.info("summaryService", "Summary generated successfully");

  const response: any = completion?.choices[0]?.message.content;
  const data = JSON.parse(extractJson(response));

  logger.info("summaryService", "Summary extracted successfully");
  const properPath = path.join(footpath, "summary.json");
  fs.writeFileSync(properPath, JSON.stringify(data, null, 2));

  logger.info(
    "summaryService",
    `Summary saved successfully to path ${properPath}`,
  );
  return data;
}

export async function createSummaryReport() {
  try {
    const footpath = resolveTranscriptsFilePath();
    const properPath = path.join(footpath, "summary.json");

    const ret = fs.readFileSync(properPath, "utf8");
    const data = normaliseSummary(JSON.parse(ret));

    logger.info(
      "createSummaryReport",
      `Summary read successfully from path ${properPath}`,
    );

    const pdfPath = path.join(footpath, "summary.pdf");

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    logger.info("createSummaryReport", `Summary report in progress`);

    const out = fs.createWriteStream(pdfPath);
    const written = new Promise<void>((resolve, reject) => {
      out.on("finish", () => resolve());
      out.on("error", reject);
    });
    doc.pipe(out);

    // ============================
    // HEADER
    // ============================
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Meeting Summary Report", { align: "center" });

    doc.moveDown(0.3);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text(`Generated on ${new Date().toLocaleDateString()}`, {
        align: "center",
      });

    doc.moveDown(0.6);

    // subtle divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#DDDDDD").stroke();

    doc.moveDown(1);
    doc.fillColor("black");

    // ============================
    // MEETING OVERVIEW
    // ============================
    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .text("Meeting Overview", { underline: false });

    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(11).lineGap(3).text(data.meetingSummary, {
      align: "justify",
    });

    doc.moveDown(0.9);

    // ============================
    // KEY DISCUSSION POINTS
    // ============================
    doc.font("Helvetica-Bold").fontSize(15).text("Key Discussion Points");

    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(11).lineGap(3);

    data.keyDiscussionPoints.forEach((point: string, index: number) => {
      doc.text(`${index + 1}. ${point}`, {
        indent: 18,
      });
    });

    doc.moveDown(0.9);

    // ============================
    // PARTICIPANT CONTRIBUTIONS
    // ============================
    doc.font("Helvetica-Bold").fontSize(15).text("Participant Contributions");

    doc.moveDown(0.3);

    doc.fontSize(11).lineGap(3);

    const contributions = Object.entries(data.participantContributions);
    if (contributions.length === 0) {
      doc.font("Helvetica").text("No individual contributions were identified.", {
        indent: 18,
      });
    }
    contributions.forEach(([name, contribution]) => {
      doc.font("Helvetica-Bold").text(name);

      doc.font("Helvetica").text(contribution || "-", {
        indent: 18,
        align: "justify",
      });

      doc.moveDown(0.4);
    });

    // ============================
    // PARTICIPANT COUNT
    // ============================
    doc.moveDown(0.6);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text(`Total Participants: ${data.participantCount}`);

    doc.fillColor("black");

    // ============================
    // FOOTER
    // ============================
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#DDDDDD").stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(9)
      .fillColor("#777777")
      .text(
        "This document is system-generated and intended for internal reference.",
        { align: "center" },
      );

    // ============================
    // FINALIZE
    // ============================
    doc.end();
    await written;

    logger.info(
      "createSummaryReport",
      `Summary report generated successfully and saved to path ${pdfPath}`,
    );

    return pdfPath;
  } catch (e) {
    logger.error(
      "createSummaryReport",
      `Error while generating summary report: ${e}`,
    );
    return null;
  }
}
