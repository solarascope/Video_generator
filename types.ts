export type RecordingSupportState = boolean | null;

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

export type RenderStatus = "completed" | "processing" | "error";

export interface RenderHistoryItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  type: string;
  durationSeconds?: number;
  status?: RenderStatus;
  captions?: string;
  transcript?: string;
  shareId?: string;
  recipe?: string;
  createdAtISO?: string;
}

export type AccessStatus = "unknown" | "valid" | "inactive" | "expired";

export interface VideoSettings {
  videoType: string;
  style: string;
  duration: string;
  aspectRatio: string;
}