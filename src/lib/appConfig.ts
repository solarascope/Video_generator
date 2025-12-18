import fs from "fs";
import path from "path";

export type RenderProviderConfig = "json2video" | "mock" | "runway";

export interface AppConfig {
  json2VideoApiKey?: string;
  openAiApiKey?: string;
  maxUploadBytes?: number;
  maxRecordingSeconds?: number;
  renderProvider?: RenderProviderConfig;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "app-config.json");

function readConfigFile(): Partial<AppConfig> {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<AppConfig>;
  } catch {
    return {};
  }
}

export function getAppConfig(): Partial<AppConfig> {
  return readConfigFile();
}

export function updateAppConfig(partial: Partial<AppConfig>): AppConfig {
  const current = readConfigFile();
  const merged: AppConfig = {
    ...current,
    ...partial,
  };

  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write app-config.json", err);
  }

  return merged;
}

export function getJson2VideoApiKey(): string | undefined {
  const cfg = getAppConfig();
  return cfg.json2VideoApiKey || process.env.VIDEO_API_KEY;
}

export function getOpenAiApiKey(): string | undefined {
  const cfg = getAppConfig();
  return cfg.openAiApiKey || process.env.OPENAI_API_KEY;
}

export function getMaxUploadBytes(defaultValue: number): number {
  const cfg = getAppConfig();
  if (typeof cfg.maxUploadBytes === "number" && cfg.maxUploadBytes > 0) {
    return cfg.maxUploadBytes;
  }
  return defaultValue;
}

export function getMaxRecordingSeconds(defaultValue: number): number {
  const cfg = getAppConfig();
  if (typeof cfg.maxRecordingSeconds === "number" && cfg.maxRecordingSeconds > 0) {
    return cfg.maxRecordingSeconds;
  }
  return defaultValue;
}

export function getConfiguredRenderProvider(): RenderProviderConfig | undefined {
  const cfg = getAppConfig();
  if (!cfg.renderProvider) return undefined;
  if (cfg.renderProvider === "json2video" || cfg.renderProvider === "mock" || cfg.renderProvider === "runway") {
    return cfg.renderProvider;
  }
  return undefined;
}
