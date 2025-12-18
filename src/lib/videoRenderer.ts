import { callVideoApi, type StoryboardPayload, type StoryboardShot, type RenderSettings } from "./videoUtils";
import { getConfiguredRenderProvider } from "./appConfig";

export type RenderProvider = "json2video" | "runway" | "mock";

export interface RenderInput {
  script: string;
  storyboard: StoryboardShot[];
  settings?: RenderSettings;
}

export interface RenderOutput {
  videoUrl: string;
  provider: RenderProvider;
}

export interface VideoRenderer {
  provider: RenderProvider;
  render(input: RenderInput): Promise<RenderOutput>;
}

async function renderWithJson2Video(input: RenderInput): Promise<RenderOutput> {
  const payload: StoryboardPayload = {
    script: input.script,
    storyboard: input.storyboard,
    settings: input.settings,
  };

  const videoUrl = await callVideoApi(payload);
  return { videoUrl, provider: "json2video" };
}

async function renderWithRunway(input: RenderInput): Promise<RenderOutput> {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    throw new Error("RunwayML renderer is not configured. Set RUNWAY_API_KEY to enable it.");
  }

  throw new Error("RunwayML renderer is not implemented yet.");
}

async function renderWithMock(input: RenderInput): Promise<RenderOutput> {
  throw new Error("Mock renderer is not implemented yet. Switch to JSON2Video in admin settings.");
}

export function getActiveRenderer(providerOverride?: RenderProvider): VideoRenderer {
  const fromConfig = getConfiguredRenderProvider() as RenderProvider | undefined;
  const fromEnv = process.env.VIDEO_RENDER_PROVIDER as RenderProvider | undefined;
  const provider = providerOverride || fromConfig || fromEnv || "json2video";

  if (provider === "runway") {
    return {
      provider: "runway",
      render: renderWithRunway,
    };
  }

  if (provider === "mock") {
    return {
      provider: "mock",
      render: renderWithMock,
    };
  }

  return {
    provider: "json2video",
    render: renderWithJson2Video,
  };
}
