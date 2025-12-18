import { NextResponse } from "next/server";
import { 
  callVideoApi, 
  validateStoryboardPayload, 
  type StoryboardPayload 
} from "../../../lib/videoUtils";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as StoryboardPayload | null;

    if (!body) {
      return NextResponse.json({ error: "Missing JSON body" }, { status: 400 });
    }

    const validation = validateStoryboardPayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid storyboard payload", details: validation.errors },
        { status: 400 },
      );
    }

    const videoUrl = await callVideoApi(body);

    return NextResponse.json({
      script: body.script,
      storyboard: body.storyboard,
      videoUrl,
    });
  } catch (err: unknown) {
    console.error("/api/generate-video error", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}