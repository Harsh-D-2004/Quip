import fs from "fs";
import { OpenRouter } from "@openrouter/sdk";
import Logger from "../../helpers/logger";
import { getTranscriptsFilePath } from "../../helpers/captionsFile";
import path from "path";
import "dotenv/config";
import PDFDocument from "pdfkit";

const openRouter = new OpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

let logger: any = new Logger("SummaryService");

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

function extractJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found");
  return match[0];
}

export async function summaryService(): Promise<any> {
  const footpath = getTranscriptsFilePath();
  const contextPath = path.join(footpath, "transcription.txt");
  let text = fs.readFileSync(contextPath, "utf8");
  logger.info("summaryService", "Captions file read successfully");

  const prompt = systemPrompt(text);
  logger.info("summaryService", "Prompt generated successfully");

  const completion = await openRouter.chat.send({
    model: "nousresearch/hermes-3-llama-3.1-405b:free",
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
                },
                required: ["name"],
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
    const footpath = getTranscriptsFilePath();
    const properPath = path.join(footpath, "summary.json");

    const ret = fs.readFileSync(properPath, "utf8");
    const data = JSON.parse(ret);

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

    doc.pipe(fs.createWriteStream(pdfPath));

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

    (
      Object.entries(data.participantContributions) as [string, string][]
    ).forEach(([name, contribution]) => {
      doc.font("Helvetica-Bold").text(name);

      doc.font("Helvetica").text(contribution, {
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
