import { NextResponse } from "next/server";
import {
  generateStoryboardFromText,
  transcribeAudioFile,
  type StoryboardResponse,
  type GenerateOptions,
} from "../../../lib/storyboardUtils";

export const runtime = "nodejs";

function buildOptionsFromFields(fields: Record<string, unknown>): GenerateOptions {
  const opts: GenerateOptions = {};

  const videoType = fields.videoType;
  if (typeof videoType === "string" && videoType.trim()) {
    opts.videoType = videoType.trim();
  }

  const style = fields.style;
  if (typeof style === "string" && style.trim()) {
    opts.style = style.trim();
  }

  const duration = fields.duration;
  if (typeof duration === "string") {
    const n = parseInt(duration, 10);
    if (!Number.isNaN(n) && n > 0) {
      opts.durationSeconds = n;
    }
  }

  const aspect = fields.aspectRatio;
  if (typeof aspect === "string" && aspect.trim()) {
    opts.aspectRatio = aspect.trim();
  }

  return opts;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let textInput: string | null = null;
    let transcript: string | null = null;
    let options: GenerateOptions = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()as unknown as FormData;
      const file = formData.get("file");
      const textField = formData.get("text");

      if (typeof textField === "string" && textField.trim()) {
        textInput = textField.trim();
      }

      options = buildOptionsFromFields({
        videoType: formData.get("videoType") ?? undefined,
        style: formData.get("style") ?? undefined,
        duration: formData.get("duration") ?? undefined,
        aspectRatio: formData.get("aspectRatio") ?? undefined,
      });

      if (file instanceof File) {
        transcript = await withTimeout(transcribeAudioFile(file), 60000, "Audio transcription");
      }
    } else {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (typeof body?.text === "string" && body.text.trim()) {
        textInput = (body.text as string).trim();
      }
      options = buildOptionsFromFields(body || {});
    }

    const finalText = transcript || textInput;

    if (!finalText) {
      return NextResponse.json({ error: "Text or audio input required" }, { status: 400 });
    }

    const storyboard = await withTimeout(
      generateStoryboardFromText(finalText, options),
      90000,
      "Script and storyboard generation",
    );

    const responseBody: StoryboardResponse = {
      ...storyboard,
      transcript: transcript ?? undefined,
    };

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    console.error("/api/generate error", err);

    let friendly = "Failed to generate script and storyboard. Please try again.";
    if (err instanceof Error && err.message.toLowerCase().includes("timed out")) {
      friendly = "Generation took too long. Please try again with a shorter input or audio clip.";
    }

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
