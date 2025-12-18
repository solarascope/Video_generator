import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { SharedVideo } from "@/lib/models/SharedVideo";
import { getAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

interface SharedVideoCreateBody {
  videoUrl?: string;
  title?: string;
  captions?: string;
  transcript?: string;
  aspectRatio?: string;
}

export async function POST(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.userId || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as SharedVideoCreateBody | null;
    const videoUrl = body?.videoUrl;
    const title = body?.title;

    if (typeof videoUrl !== "string" || !videoUrl.trim() || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "videoUrl and title are required" }, { status: 400 });
    }

    const captions = typeof body?.captions === "string" ? body.captions : undefined;
    const transcript = typeof body?.transcript === "string" ? body.transcript : undefined;
    const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : undefined;

    const shareId = crypto.randomBytes(16).toString("hex");

    await connectToDatabase();

    const doc = await SharedVideo.create({
      shareId,
      workspaceId: auth.workspaceId,
      ownerId: auth.userId,
      videoUrl: videoUrl.trim(),
      title: title.trim(),
      captions,
      transcript,
      aspectRatio,
    });

    return NextResponse.json({
      shareId: doc.shareId,
      videoUrl: doc.videoUrl,
      title: doc.title,
      captions: doc.captions,
      transcript: doc.transcript,
      aspectRatio: doc.aspectRatio,
    });
  } catch (err) {
    console.error("/api/shared-video POST error", err);
    return NextResponse.json({ error: "Failed to create shared video." }, { status: 500 });
  }
}
