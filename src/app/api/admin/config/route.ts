import { NextResponse } from "next/server";
import { getAppConfig, updateAppConfig, getMaxUploadBytes, getMaxRecordingSeconds } from "@/lib/appConfig";
import type { RenderProviderConfig } from "@/lib/appConfig";

export const runtime = "nodejs";

interface AdminConfigResponse {
  hasJson2VideoApiKey: boolean;
  hasOpenAiApiKey: boolean;
  maxUploadBytes: number;
  maxRecordingSeconds: number;
  renderProvider: RenderProviderConfig;
}

interface AdminConfigUpdateBody {
  json2VideoApiKey?: string;
  openAiApiKey?: string;
  maxUploadBytes?: number;
  maxRecordingSeconds?: number;
  renderProvider?: RenderProviderConfig;
}

export async function GET() {
  const cfg = getAppConfig();

  const hasJson2VideoApiKey = Boolean(cfg.json2VideoApiKey || process.env.VIDEO_API_KEY);
  const hasOpenAiApiKey = Boolean(cfg.openAiApiKey || process.env.OPENAI_API_KEY);

  const maxUploadBytes = getMaxUploadBytes(25 * 1024 * 1024);
  const maxRecordingSeconds = getMaxRecordingSeconds(90);

  const renderProvider = (cfg.renderProvider || (process.env.VIDEO_RENDER_PROVIDER as RenderProviderConfig) || "json2video") as RenderProviderConfig;

  const body: AdminConfigResponse = {
    hasJson2VideoApiKey,
    hasOpenAiApiKey,
    maxUploadBytes,
    maxRecordingSeconds,
    renderProvider,
  };

  return NextResponse.json(body);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as AdminConfigUpdateBody | null;

    if (!body) {
      return NextResponse.json({ error: "Missing JSON body" }, { status: 400 });
    }

    const partial: AdminConfigUpdateBody = {};

    if (typeof body.json2VideoApiKey === "string" && body.json2VideoApiKey.trim()) {
      partial.json2VideoApiKey = body.json2VideoApiKey.trim();
    }

    if (typeof body.openAiApiKey === "string" && body.openAiApiKey.trim()) {
      partial.openAiApiKey = body.openAiApiKey.trim();
    }

    if (typeof body.maxUploadBytes === "number" && body.maxUploadBytes > 0) {
      partial.maxUploadBytes = Math.floor(body.maxUploadBytes);
    }

    if (typeof body.maxRecordingSeconds === "number" && body.maxRecordingSeconds > 0) {
      partial.maxRecordingSeconds = Math.floor(body.maxRecordingSeconds);
    }

    if (body.renderProvider && ["json2video", "mock", "runway"].includes(body.renderProvider)) {
      partial.renderProvider = body.renderProvider;
    }

    const updated = updateAppConfig(partial);

    const response: AdminConfigResponse = {
      hasJson2VideoApiKey: Boolean(updated.json2VideoApiKey || process.env.VIDEO_API_KEY),
      hasOpenAiApiKey: Boolean(updated.openAiApiKey || process.env.OPENAI_API_KEY),
      maxUploadBytes: getMaxUploadBytes(25 * 1024 * 1024),
      maxRecordingSeconds: getMaxRecordingSeconds(90),
      renderProvider: (updated.renderProvider || "json2video") as RenderProviderConfig,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("/api/admin/config error", err);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
