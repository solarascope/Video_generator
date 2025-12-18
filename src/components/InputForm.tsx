// components/InputForm.tsx
import { ChangeEvent } from "react";
import { RecordingSupportState, StoryboardResponse, VideoSettings } from "../../types";

interface InputFormProps {
  audioFile: File | null;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  audioPreviewUrl: string | null;
  textInput: string;
  setTextInput: (text: string) => void;
  loading: boolean;
  isRecording: boolean;
  recordingSupported: RecordingSupportState;
  recordingDuration: number;
  startRecording: () => void;
  stopRecording: () => void;
  maxUploadBytes: number;
  maxRecordingSecondsConfig: number;
  settings: VideoSettings;
  setSettings: (settings: VideoSettings) => void;
  storyboard: StoryboardResponse | null;
  handleGenerate: (e: React.FormEvent) => void;
  handleRender: () => void;
  error: string | null;
  canRetryRender: boolean;
}

export default function InputForm({
  audioFile,
  handleFileChange,
  audioPreviewUrl,
  textInput,
  setTextInput,
  loading,
  isRecording,
  recordingSupported,
  recordingDuration,
  startRecording,
  stopRecording,
  maxUploadBytes,
  maxRecordingSecondsConfig,
  settings,
  setSettings,
  storyboard,
  handleGenerate,
  handleRender,
  error,
  canRetryRender
}: InputFormProps) {
  
  const updateSetting = (key: keyof VideoSettings, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-medium text-zinc-900">Input</h2>
        <p className="text-xs text-zinc-600">
          Use either audio (upload or record) or plain text.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-800">Audio file</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={loading || isRecording}
            className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-[11px] text-zinc-500">
            Accepted formats: MP3, WAV, M4A. Max upload size ~{Math.round(maxUploadBytes / (1024 * 1024))}MB.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-800">Or record directly</label>
            {isRecording && (
              <span className="text-xs font-medium text-red-600 animate-pulse">
                Recording... {recordingDuration}s
              </span>
            )}
          </div>
          {recordingSupported !== false && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading || recordingSupported === null}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm border disabled:cursor-not-allowed disabled:opacity-60 transition-all ${isRecording
                    ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                    : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                  }`}
              >
                {isRecording ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> Stop Recording
                  </span>
                ) : (
                  "Record Audio"
                )}
              </button>
              {!isRecording && audioFile && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md">
                  Ready: {audioFile.name}
                </span>
              )}
            </div>
          )}
          <p className="text-[11px] text-zinc-500">
            Maximum recording length {maxRecordingSecondsConfig}s.
          </p>
        </div>

        {audioPreviewUrl && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-800">Audio preview</p>
            <audio controls src={audioPreviewUrl} className="w-full" />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-800">Text (optional)</label>
            <span className="text-xs text-zinc-500">Skip if using audio</span>
          </div>
          <textarea
            rows={5}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={loading}
            placeholder="Paste your idea, script, or talking points here..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700">Video type</label>
            <select
              value={settings.videoType}
              onChange={(e) => updateSetting('videoType', e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="explainer">Explainer</option>
              <option value="promo">Promo / Offer</option>
              <option value="tutorial">Tutorial</option>
              <option value="hook">Social Hook</option>
              <option value="testimonial">Testimonial</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700">Style</label>
            <select
              value={settings.style}
              onChange={(e) => updateSetting('style', e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="energetic">Energetic</option>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="futuristic">Futuristic</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700">Duration</label>
            <select
              value={settings.duration}
              onChange={(e) => updateSetting('duration', e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="15">15s</option>
              <option value="30">30s</option>
              <option value="60">60s</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700">Aspect ratio</label>
            <select
              value={settings.aspectRatio}
              onChange={(e) => updateSetting('aspectRatio', e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="9:16">9:16 (vertical)</option>
              <option value="16:9">16:9 (landscape)</option>
              <option value="1:1">1:1 (square)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && !storyboard ? "Generating..." : "1. Generate Script"}
          </button>
          <button
            type="button"
            onClick={handleRender}
            disabled={loading || !storyboard}
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && storyboard ? "Rendering..." : "2. Render Video"}
          </button>
        </div>

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>
            {canRetryRender && storyboard && (
              <button
                type="button"
                onClick={handleRender}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100"
              >
                Retry render
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}