import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { StoryboardShot, RenderSettings } from "../../../lib/videoUtils";
import { getActiveRenderer, type RenderProvider } from "../../../lib/videoRenderer";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/lib/models/Workspace";
import { getAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

interface RenderRequestBody {
  script: string;
  storyboard: StoryboardShot[];
  settings?: RenderSettings;
  provider?: "json2video" | "runway";
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

async function downloadToPublicVideos(remoteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) {
      console.error("Failed to download rendered video", res.status, res.statusText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `video-${Date.now()}.mp4`;
    const publicDir = path.join(process.cwd(), "public", "videos");
    const filePath = path.join(publicDir, fileName);

    await fs.promises.mkdir(publicDir, { recursive: true });
    await fs.promises.writeFile(filePath, buffer);

    return `/videos/${fileName}`;
  } catch (err) {
    console.error("Error saving rendered video to /public/videos", err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    const body = (await request.json().catch(() => null)) as RenderRequestBody | null;

    if (!body) {
      return NextResponse.json({ error: "Missing JSON body" }, { status: 400 });
    }

    if (typeof body.script !== "string" || !body.script.trim()) {
      return NextResponse.json({ error: "script must be a non-empty string" }, { status: 400 });
    }

    if (!Array.isArray(body.storyboard) || body.storyboard.length === 0) {
      return NextResponse.json({ error: "storyboard must be a non-empty array" }, { status: 400 });
    }

    const providerOverride = body.provider as RenderProvider | undefined;
    const renderer = getActiveRenderer(providerOverride);

    const renderResult = await withTimeout(
      renderer.render({
        script: body.script,
        storyboard: body.storyboard,
        settings: body.settings,
      }),
      120000,
      "Video rendering",
    );

    const remoteUrl = renderResult.videoUrl;

    if (auth?.workspaceId) {
      try {
        await connectToDatabase();
        await Workspace.findByIdAndUpdate(auth.workspaceId, { $inc: { videoCount: 1 } });
      } catch (dbErr) {
        console.error("Failed to update workspace videoCount", dbErr);
      }
    }

    const localUrl = await downloadToPublicVideos(remoteUrl);

    return NextResponse.json({
      videoUrl: localUrl || remoteUrl,
      sourceUrl: remoteUrl,
      provider: renderer.provider,
    });
  } catch (err: unknown) {
    console.error("/api/render-video error", err);

    let friendly = "Failed to render video. Please try again later.";
    if (err instanceof Error && err.message.toLowerCase().includes("timed out")) {
      friendly = "Video rendering is taking too long. Please try again later or use a shorter script.";
    }

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
