import { NextResponse } from "next/server";
import { getJson2VideoApiKey } from "../../../lib/appConfig";

export interface StoryboardShot {
  shot: number;
  voiceover: string;
  visual_prompt: string;
}

export interface RenderSettings {
  videoType?: string;
  style?: string;
  durationSeconds?: number;
  aspectRatio?: string;
}

export interface StoryboardPayload {
  script: string;
  storyboard: StoryboardShot[];
  settings?: RenderSettings;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateStoryboardPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    errors.push("Payload must be an object");
    return { valid: false, errors };
  }

  const obj = payload as { script?: unknown; storyboard?: unknown };

  if (typeof obj.script !== "string" || !obj.script.trim()) {
    errors.push("script must be a non-empty string");
  }

  if (!Array.isArray(obj.storyboard)) {
    errors.push("storyboard must be an array");
  } else {
    if (obj.storyboard.length < 1) {
      errors.push("storyboard must contain at least one shot");
    }
    (obj.storyboard as StoryboardShot[]).forEach((shot, index) => {
      if (typeof shot !== "object" || shot === null) {
        errors.push(`shot[${index}] must be an object`);
        return;
      }
      if (typeof shot.shot !== "number") {
        errors.push(`shot[${index}].shot must be a number`);
      }
      if (typeof shot.voiceover !== "string" || !shot.voiceover.trim()) {
        errors.push(`shot[${index}].voiceover must be a non-empty string`);
      }
      if (typeof shot.visual_prompt !== "string" || !shot.visual_prompt.trim()) {
        errors.push(`shot[${index}].visual_prompt must be a non-empty string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateScenes(
  scenes: Array<{
    duration: unknown;
    elements: Array<{
      type: string;
      settings?: Record<string, unknown>;
      zoom?: unknown;
    }>;
  }>,
): boolean {
  for (const [sceneIdx, scene] of scenes.entries()) {
    if (typeof scene.duration !== 'number' || scene.duration < 1) {
      throw new Error(`Scene ${sceneIdx}: duration must be positive integer`);
    }
    for (const [elemIdx, elem] of scene.elements.entries()) {
      if (elem.type === 'text') {
        if (!elem.settings || typeof elem.settings !== 'object') {
          throw new Error(`Scene ${sceneIdx}/text ${elemIdx}: must have "settings" object`);
        }
        if (typeof elem.settings['font-size'] !== 'string' || !elem.settings['font-size'].endsWith('px')) {
          throw new Error(`Scene ${sceneIdx}/text ${elemIdx}: font-size must be string like "40px"`);
        }
      } else if (elem.type === 'image' && elem.zoom !== undefined) {
        if (typeof elem.zoom !== 'number' || !Number.isInteger(elem.zoom) || elem.zoom < -10 || elem.zoom > 10) {
          throw new Error(`Scene ${sceneIdx}/image ${elemIdx}: zoom must be integer -10 to 10`);
        }
      }
    }
  }
  return true;
}

function mapStoryboardToScenes(payload: StoryboardPayload) {
  const totalDuration = payload.settings?.durationSeconds || 30;
  const sceneCount = Math.max(1, payload.storyboard.length);
  const durationPerScene = Math.max(3, Math.floor(totalDuration / sceneCount));

  const isPortrait = payload.settings?.aspectRatio === "9:16";
  const isSquare = payload.settings?.aspectRatio === "1:1";
  
  const width = isPortrait ? 1080 : (isSquare ? 1080 : 1920);

  let aiAspectRatio = "horizontal";
  if (isPortrait) aiAspectRatio = "vertical";
  if (isSquare) aiAspectRatio = "squared";

  const scenes = payload.storyboard.map((shot, index) => {
    
    const zoomValue = index % 2 === 0 ? 1 : 0;
    
    const imageElement: Record<string, unknown> = {
      type: "image",
      model: "freepik-classic",
      prompt: shot.visual_prompt,
      "aspect-ratio": aiAspectRatio,
      resize: "fill" 
    };

    if (zoomValue !== 0) {
      imageElement.zoom = zoomValue;
    }

    const textElement = {
      type: "text",
      style: "011",
      text: shot.voiceover, 
      position: "custom",
      x: 0,
      y: 50,
      width: width, 
      settings: {
        "font-family": "Roboto",
        "font-size": "40px",
        "font-color": "#FFFFFF", 
        "background-color": "rgba(0, 0, 0, 0.6)",
        "text-align": "center",
      },
    };

    const voiceElement = {
      type: "voice",
      model: "azure", 
      voice: "en-US-AndrewMultilingualNeural", 
      text: shot.voiceover 
    };

    return {
      duration: durationPerScene,
      comment: `Scene ${index + 1}: ${shot.visual_prompt.slice(0, 50)}...`,
      elements: [
        imageElement,
        voiceElement,
        textElement,
      ],
    };
  });

  validateScenes(scenes);
  return scenes;
}

export async function callVideoApi(payload: StoryboardPayload): Promise<string> {

  const apiUrl = process.env.VIDEO_API_URL!;
  const apiKey = getJson2VideoApiKey();

  if (!apiKey) {
    throw new Error("JSON2Video API key is not configured.");
  }

  const isPortrait = payload.settings?.aspectRatio === "9:16";
  const isSquare = payload.settings?.aspectRatio === "1:1";

  const width = isPortrait ? 1080 : (isSquare ? 1080 : 1920);
  const height = isPortrait ? 1920 : (isSquare ? 1080 : 1080);

  const scenes = mapStoryboardToScenes(payload);

  const createBody = {
    resolution: "custom",
    width: width,
    height: height,
    scenes,
  };


  const createRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`Video API create failed: ${createRes.status} ${createRes.statusText} ${text}`);
  }

  const createData = await createRes.json();

  if (!createData.success || !createData.project) {
    throw new Error("Video API create did not return a valid project id");
  }

  const projectId: string = createData.project;

  const maxAttempts = Number(process.env.VIDEO_API_MAX_POLLS || 20);
  const intervalMs = Number(process.env.VIDEO_API_POLL_INTERVAL_MS || 5000);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const statusRes = await fetch(`${apiUrl}?project=${encodeURIComponent(projectId)}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!statusRes.ok) {
      const text = await statusRes.text().catch(() => "");
      throw new Error(`Video API status failed: ${statusRes.status} ${statusRes.statusText} ${text}`);
    }

    const statusData = await statusRes.json();
    const movie = statusData.movie;

    if (movie?.status === "done" && movie?.url) {
      return movie.url;
    }

    if (movie?.status === "error") {
      throw new Error(movie.message || "Video rendering error from JSON2Video");
    }
  }

  throw new Error("Timed out waiting for video rendering to complete");
}

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