import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";
import { getOpenAiApiKey } from "../lib/appConfig";

export const runtime = "nodejs";

export interface StoryboardShot {
  shot: number;
  voiceover: string;
  visual_prompt: string;
}

export interface StoryboardResponse {
  script: string;
  storyboard: StoryboardShot[];
  transcript?: string;
}

export interface GenerateOptions {
  videoType?: string;
  style?: string;
  durationSeconds?: number;
  aspectRatio?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateStoryboard(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    errors.push("Response must be an object");
    return { valid: false, errors };
  }

  const obj = payload as { script?: unknown; storyboard?: unknown };

  if (typeof obj.script !== "string" || !obj.script.trim()) {
    errors.push("script must be a non-empty string");
  }

  if (!Array.isArray(obj.storyboard)) {
    errors.push("storyboard must be an array");
  } else {
    if (obj.storyboard.length < 3) {
      errors.push("storyboard must contain at least 3 shots");
    }

    (obj.storyboard as StoryboardShot[]).forEach((shot, index) => {
      if (typeof shot !== "object" || shot === null) {
        errors.push(`shot[${index}] must be an object`);
        return;
      }
      if (typeof shot.shot !== "number") {
        errors.push(`shot[${index}].shot must be a number`);
      }
      if (!shot.voiceover || typeof shot.voiceover !== "string") {
        errors.push(`shot[${index}].voiceover must be a string`);
      }
      if (!shot.visual_prompt || typeof shot.visual_prompt !== "string") {
        errors.push(`shot[${index}].visual_prompt must be a string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}


function getOpenAiClient(): OpenAI {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }
  return new OpenAI({ apiKey });
}

export async function transcribeAudioFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `upload-${Date.now()}.webm`);

  await fs.promises.writeFile(tmpPath, buffer);

  try {
    const openai = getOpenAiClient();
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: "whisper-1",
      language: "en"
    });

    if (!transcription.text || !transcription.text.trim()) {
      throw new Error("Whisper returned empty transcription");
    }

    return transcription.text.trim();
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}


export async function generateStoryboardFromText(
  input: string,
  options?: GenerateOptions,
): Promise<Omit<StoryboardResponse, "transcript">> {
  if (!getOpenAiApiKey()) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const contextLines: string[] = [];
  if (options?.videoType) {
    contextLines.push(`Video type: ${options.videoType}. Structure the script appropriately for this format.`);
  }
  if (options?.style) {
    contextLines.push(`Style: ${options.style}. Match the tone, pacing, and language to this style.`);
  }
  if (options?.durationSeconds) {
    contextLines.push(
      `Target duration: about ${options.durationSeconds} seconds total. Keep the number of shots and length of each line appropriate for this duration.`,
    );
  }
  if (options?.aspectRatio) {
    contextLines.push(
      `Target aspect ratio: ${options.aspectRatio}. Prefer visuals that work well for this format (for example, vertical framing for 9:16).`,
    );
  }

  const promptLines: string[] = [
    "You are generating a short 20–45 second video script.",
    "Create 5–8 storyboard shots based on the user's idea.",
    "",
    "RULES:",
    "- ALWAYS respond in English. Ignore input language.",
    "- Keep script simple and natural.",
    "- Each shot requires:",
    "   • shot (number)",
    "   • voiceover (max 1 sentence)",
    "   • visual_prompt (clear description)",
  ];

  if (contextLines.length > 0) {
    promptLines.push("", "CONTEXT:", ...contextLines);
  }

  promptLines.push(
    "",
    "Return ONLY JSON in this shape:",
    "{",
    '  "script": "string",',
    '  "storyboard": [',
    '    { "shot": 1, "voiceover": "string", "visual_prompt": "string" }',
    "  ]",
    "}",
    "",
    "USER INPUT:",
    input,
  );

  const prompt = promptLines.join("\n");

  const openai = getOpenAiClient();
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2, 
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const validation = validateStoryboard(parsed);
  if (!validation.valid) {
    throw new Error("Storyboard validation error: " + validation.errors.join(", "));
  }

  return parsed;
}


