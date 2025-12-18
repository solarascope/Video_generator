'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccessStatus, RecordingSupportState, RenderHistoryItem, StoryboardResponse, StoryboardShot, VideoSettings } from "../../types";
import AccessSection from "@/components/AccessSection";
import InputForm from "@/components/InputForm";
import OutputDisplay from "@/components/OutputDisplay";
import { useAuth } from "@/components/AuthProvider";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 90;

export default function Home() {
  const router = useRouter();
  const { user, workspace, token, isAuthenticated, authLoading, logout } = useAuth();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState<RecordingSupportState>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);

  const [accessKey, setAccessKey] = useState("");
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("unknown");
  const [accessStatusMessage, setAccessStatusMessage] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

  const [settings, setSettings] = useState<VideoSettings>({
    videoType: "explainer",
    style: "professional",
    duration: "30",
    aspectRatio: "9:16"
  });

  const [history, setHistory] = useState<RenderHistoryItem[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [maxUploadBytes, setMaxUploadBytes] = useState<number>(MAX_AUDIO_BYTES);
  const [maxRecordingSecondsConfig, setMaxRecordingSecondsConfig] = useState<number>(MAX_RECORDING_SECONDS);
  const [currentCaptions, setCurrentCaptions] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [canRetryRender, setCanRetryRender] = useState(false);
  const [phase, setPhase] = useState<"idle" | "generatingScript" | "renderingVideo">("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingDurationRef = useRef(0);
  const audioPreviewUrlRef = useRef<string | null>(null);

  const brandPrimary = workspace?.primaryColor || undefined;
  const brandSecondary = workspace?.secondaryColor || undefined;


  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authLoading) return;

    const storedToken = window.localStorage.getItem("solaraAuthToken");
    if (!isAuthenticated || !storedToken) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!workspace) return;
    setSettings((prev) => {
      const allowedVideoTypes = ["explainer", "promo", "tutorial", "hook", "testimonial"] as const;
      const nextVideoType =
        workspace.defaultRecipe && allowedVideoTypes.includes(workspace.defaultRecipe as typeof allowedVideoTypes[number])
          ? workspace.defaultRecipe
          : prev.videoType;

      return {
        ...prev,
        videoType: nextVideoType,
        style: workspace.defaultStyle ?? prev.style,
        aspectRatio: workspace.defaultAspectRatio ?? prev.aspectRatio,
      };
    });
  }, [workspace]);

  const updateAudioPreview = (file: File | null) => {
    if (audioPreviewUrlRef.current) {
      URL.revokeObjectURL(audioPreviewUrlRef.current);
      audioPreviewUrlRef.current = null;
    }

    if (file) {
      const url = URL.createObjectURL(file);
      audioPreviewUrlRef.current = url;
      setAudioPreviewUrl(url);
    } else {
      setAudioPreviewUrl(null);
    }
  };

  async function validateAccess(key: string, storeOnSuccess: boolean = true) {
    const trimmed = key.trim();
    if (!trimmed) {
      setAccessStatus("inactive");
      setAccessStatusMessage("Enter your access key to unlock SolaraVideo.");
      return;
    }

    try {
      setCheckingAccess(true);
      setAccessStatusMessage(null);

      const res = await fetch("/api/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });

      const data = (await res.json().catch(() => null)) as
        | { valid?: boolean; state?: string; error?: string }
        | null;

      if (!res.ok) {
        throw new Error((data && (data.error as string)) || "Unable to validate access key.");
      }

      const state = (data && (data.state as string)) || "inactive";
      const valid = Boolean(data && data.valid);

      if (valid && state === "active") {
        setAccessStatus("valid");
        setAccessStatusMessage("Access granted. You can now generate videos.");
        if (storeOnSuccess && typeof window !== "undefined") {
          window.localStorage.setItem("solaraAccessKey", trimmed);
        }
      } else {
        const mappedState: AccessStatus = state === "expired" ? "expired" : "inactive";
        setAccessStatus(mappedState);
        const fallbackMessage = mappedState === "expired" ? "This access key has expired." : "This access key is not active.";
        setAccessStatusMessage((data && (data.error as string)) || fallbackMessage);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("solaraAccessKey");
        }
      }
    } catch (err) {
      console.error(err);
      setAccessStatus("inactive");
      setAccessStatusMessage(
        err instanceof Error ? err.message : "Unable to validate access key. Please try again later.",
      );
    } finally {
      setCheckingAccess(false);
    }
  }


  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("solaraAccessKey");
    if (stored) {
      validateAccess(stored, false);
    } else {
      setAccessStatus("inactive");
      setAccessStatusMessage("Enter your access key to unlock SolaraVideo.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLimits() {
      try {
        const res = await fetch("/api/admin/config");
        const data = (await res.json().catch(() => null)) as
          | { maxUploadBytes?: number; maxRecordingSeconds?: number }
          | null;
        if (!res.ok || !data || cancelled) return;
        if (typeof data.maxUploadBytes === "number" && data.maxUploadBytes > 0) setMaxUploadBytes(data.maxUploadBytes);
        if (typeof data.maxRecordingSeconds === "number" && data.maxRecordingSeconds > 0)
          setMaxRecordingSecondsConfig(data.maxRecordingSeconds);
      } catch {
        // ignore admin config load errors; fall back to defaults
      }
    }
    loadLimits();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecordingSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof MediaRecorder !== "undefined");
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("solaraHistory");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;

      const restored: RenderHistoryItem[] = parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const obj = item as Record<string, unknown>;
          if (typeof obj.id !== "string" || typeof obj.title !== "string" || typeof obj.url !== "string") {
            return null;
          }

          const createdAt =
            typeof obj.createdAt === "string"
              ? obj.createdAt
              : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const type = typeof obj.type === "string" ? obj.type : "Unknown";

          const entry: RenderHistoryItem = {
            id: obj.id,
            title: obj.title,
            url: obj.url,
            createdAt,
            type,
          };

          if (typeof obj.durationSeconds === "number") {
            entry.durationSeconds = obj.durationSeconds;
          }
          if (typeof obj.status === "string") {
            entry.status = obj.status as RenderHistoryItem["status"];
          }
          if (typeof obj.captions === "string") {
            entry.captions = obj.captions;
          }
          if (typeof obj.transcript === "string") {
            entry.transcript = obj.transcript;
          }
          if (typeof obj.shareId === "string") {
            entry.shareId = obj.shareId;
          }
          if (typeof obj.recipe === "string") {
            entry.recipe = obj.recipe;
          }
          if (typeof obj.createdAtISO === "string") {
            entry.createdAtISO = obj.createdAtISO;
          }

          return entry;
        })
        .filter((v): v is RenderHistoryItem => v !== null);

      if (restored.length > 0) {
        setHistory(restored);
      }
    } catch (err) {
      console.error("Failed to restore history from localStorage", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (history.length === 0) {
      window.localStorage.removeItem("solaraHistory");
      return;
    }

    try {
      window.localStorage.setItem("solaraHistory", JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save history to localStorage", err);
    }
  }, [history]);


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > maxUploadBytes) {
      setAudioFile(null);
      updateAudioPreview(null);
      setStatusText(null);
      setError("Audio file is too large.");
      return;
    }

    if (file) {
      const lowerName = file.name.toLowerCase();
      if (![".mp3", ".wav", ".m4a"].some((ext) => lowerName.endsWith(ext))) {
        setAudioFile(null);
        updateAudioPreview(null);
        setStatusText(null);
        setError("Invalid file format. MP3, WAV, or M4A only.");
        return;
      }
    }

    setAudioFile(file);
    updateAudioPreview(file);
    if (file) {
      setStatusText("Audio file selected. Ready to generate video.");
      setError(null);
    }
  };

  const startRecording = async () => {
    if (loading || isRecording) return;
    if (recordingSupported === false) {
      setError("Browser recording is not supported.");
      return;
    }

    try {
      setError(null);
      setStatusText("Recording audio...");
      setRecordingDuration(0);
      recordingDurationRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        if (recordingDurationRef.current < 2) {
          setAudioFile(null);
          updateAudioPreview(null);
          setIsRecording(false);
          setStatusText(null);
          setError("Recording is too short.");
          return;
        }

        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
        setAudioFile(file);
        updateAudioPreview(file);
        setIsRecording(false);
        setStatusText("Recording captured. Ready to generate video.");
      };

      recorder.start();
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          recordingDurationRef.current = next;
          if (next >= maxRecordingSecondsConfig && mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setStatusText("Maximum length reached.");
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      setStatusText(null);
      setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setStatusText("Finishing recording...");
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!audioFile && !textInput.trim()) return setError("Please record/upload audio or enter text.");
    if (!isAuthenticated) return setError("Please log in to your SolaraVideo account.");
    if (accessStatus !== "valid") return setError("Please enter a valid access key.");

    try {
      setError(null);
      setVideoUrl(null);
      setStoryboard(null);
      setLoading(true);
      setPhase("generatingScript");
      setStatusText(audioFile ? "Uploading audio and transcribing..." : "Generating script...");

      const formData = new FormData();
      if (audioFile) formData.append("file", audioFile);
      if (textInput.trim()) formData.append("text", textInput.trim());
      Object.entries(settings).forEach(([k, v]) => {
        formData.append(k, v);
      });

      const scriptRes = await fetch("/api/generate", { method: "POST", body: formData });
      const scriptData = await scriptRes.json().catch(() => null);

      if (!scriptRes.ok) throw new Error((scriptData?.error) || "Failed to generate script");

      setStoryboard(scriptData as StoryboardResponse);
      setStatusText("Review the script, then click Render Final Video.");
    } catch (err) {
      console.error(err);
      setStatusText(null);
      setCanRetryRender(false);
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  };

  const handleRender = async () => {
    if (!storyboard) return setError("Please generate script first.");
    if (!isAuthenticated) return setError("Please log in to your SolaraVideo account.");
    if (accessStatus !== "valid") return setError("Please enter a valid access key.");

    try {
      setError(null);
      setLoading(true);
      setPhase("renderingVideo");
      setStatusText("3/4 Rendering video...");
      setCanRetryRender(false);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const videoRes = await fetch("/api/render-video", {
        method: "POST",
        headers,
        body: JSON.stringify({
          script: storyboard.script,
          storyboard: storyboard.storyboard,
          settings: {
            ...settings,
            durationSeconds: parseInt(settings.duration, 10),
          },
        }),
      });

      const videoData = await videoRes.json().catch(() => null);
      if (!videoRes.ok) throw new Error((videoData?.error) || "Failed to generate video");
      if (!videoData?.videoUrl) throw new Error("API did not return a video URL");

      setVideoUrl(videoData.videoUrl);
      setStatusText("4/4 Video ready.");

      const captionsText = storyboard.storyboard.map((shot: StoryboardShot) => shot.voiceover).join("\n");
      const transcriptText = storyboard.transcript || "";
      setCurrentCaptions(captionsText || null);
      setCurrentTranscript(transcriptText || null);

      const titleSource =
        storyboard.script?.split("\n")[0] || storyboard.storyboard[0]?.voiceover || "Untitled";
      const title = titleSource.slice(0, 40) + (titleSource.length > 40 ? "..." : "");

      const now = new Date();
      const item: RenderHistoryItem = {
        id: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
        title,
        url: videoData.videoUrl,
        createdAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type:
          settings.aspectRatio === "9:16"
            ? "Vertical"
            : settings.aspectRatio === "1:1"
              ? "Square"
              : "Landscape",
        durationSeconds: parseInt(settings.duration, 10),
        status: "completed",
        captions: captionsText || undefined,
        transcript: transcriptText || undefined,
        recipe: settings.videoType,
        createdAtISO: now.toISOString(),
      };

      setHistory((prev) => [item, ...prev].slice(0, 10));
      setActiveHistoryId(item.id);
    } catch (err) {
      console.error(err);
      setStatusText(null);
      setCanRetryRender(true);
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  };

  const loadFromHistory = (item: RenderHistoryItem) => {
    setVideoUrl(item.url);
    setCurrentCaptions(item.captions || null);
    setCurrentTranscript(item.transcript || null);
    setActiveHistoryId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyCaptions = async () => {
    if (currentCaptions) {
      await navigator.clipboard.writeText(currentCaptions);
      setStatusText("Captions copied.");
    }
  };

  const handleCopyTranscript = async () => {
    if (currentTranscript) {
      await navigator.clipboard.writeText(currentTranscript);
      setStatusText("Transcript copied.");
    }
  };

  const handleCreateAnother = () => {
    setAudioFile(null);
    updateAudioPreview(null);
    setTextInput("");
    setStoryboard(null);
    setVideoUrl(null);
    setStatusText(null);
    setError(null);
    setCurrentCaptions(null);
    setCurrentTranscript(null);
    setActiveHistoryId(null);
  };

  const handleShareCurrent = async () => {
    const target =
      (activeHistoryId && history.find((h) => h.id === activeHistoryId)) || history[0] || null;

    if (!target) {
      setStatusText("No video available to share yet.");
      return;
    }

    try {
      setStatusText("Creating share link...");

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/shared-video", {
        method: "POST",
        headers,
        body: JSON.stringify({
          videoUrl: target.url,
          title: target.title,
          captions: target.captions,
          transcript: target.transcript,
          aspectRatio: settings.aspectRatio,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { shareId?: string; error?: string }
        | null;

      if (!res.ok || !data?.shareId) {
        throw new Error((data && data.error) || "Failed to create share link.");
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/v/${data.shareId}`;

      await navigator.clipboard.writeText(shareUrl);
      setStatusText("Shareable link copied to clipboard.");

      setHistory((prev) =>
        prev.map((h) => (h.id === target.id ? { ...h, shareId: data.shareId } : h)),
      );
    } catch (err) {
      console.error(err);
      setStatusText(null);
      setError(err instanceof Error ? err.message : "Failed to create share link.");
    }
  };

  let currentStep: 1 | 2 | 3 = 1;
  if (phase === "renderingVideo" || !!videoUrl) {
    currentStep = 3;
  } else if (phase === "generatingScript" || !!storyboard) {
    currentStep = 2;
  }
  const steps = [
    { id: 1, label: "Upload or Record Audio" },
    { id: 2, label: "Process & Generate Script" },
    { id: 3, label: "Render Final Video" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-6xl mx-auto rounded-[20px] bg-white shadow-2xl shadow-zinc-200/50 border border-zinc-100 p-8 md:p-12 space-y-12">

        <header className="space-y-3 text-center md:text-left">
          <h1
            className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-950"
            style={brandPrimary ? { color: brandPrimary } : undefined}
          >
            SolaraVideo – AI Video Generator
          </h1>
          <p
            className="text-base text-zinc-600 max-w-3xl mx-auto md:mx-0 leading-relaxed"
            style={brandSecondary ? { color: brandSecondary } : undefined}
          >
            Turn any audio recording into a finished video automatically.
          </p>
          {isAuthenticated && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-zinc-500 max-w-3xl mx-auto md:mx-0">
              <div className="space-y-1">
                <p>
                  Logged in as <span className="font-medium">{user?.email}</span> · Workspace: <span className="font-medium">{workspace?.name ?? "Untitled"}</span>
                  {typeof workspace?.videoCount === "number" && (
                    <> · Videos created: <span className="font-medium">{workspace.videoCount}</span></>
                  )}
                </p>
                {typeof workspace?.videoCount === "number" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Usage</span>
                      <span>{workspace.videoCount} / 100 videos</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (workspace.videoCount / 100) * 100)}%`,
                          backgroundColor: brandPrimary || "#18181b",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/workspace"
                  className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 bg-white shadow-sm"
                >
                  Workspace settings
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 bg-white"
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-4 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Workflow</p>
          <ol className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8 text-sm">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <li key={step.id} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${isActive ? "border-zinc-900 bg-zinc-900 text-white" : isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 bg-white text-zinc-400"}`}>
                    {step.id}
                  </div>
                  <span className={isActive ? "text-zinc-900 font-semibold" : "text-zinc-500"}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <AccessSection
          accessKey={accessKey}
          setAccessKey={setAccessKey}
          accessStatus={accessStatus}
          accessStatusMessage={accessStatusMessage}
          checkingAccess={checkingAccess}
          onValidate={() => validateAccess(accessKey, true)}
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-start">
          <form onSubmit={handleGenerate} className="h-full">
            <InputForm
              audioFile={audioFile}
              handleFileChange={handleFileChange}
              audioPreviewUrl={audioPreviewUrl}
              textInput={textInput}
              setTextInput={setTextInput}
              loading={loading}
              isRecording={isRecording}
              recordingSupported={recordingSupported}
              recordingDuration={recordingDuration}
              startRecording={startRecording}
              stopRecording={stopRecording}
              maxUploadBytes={maxUploadBytes}
              maxRecordingSecondsConfig={maxRecordingSecondsConfig}
              settings={settings}
              setSettings={setSettings}
              storyboard={storyboard}
              handleGenerate={handleGenerate}
              handleRender={handleRender}
              error={error}
              canRetryRender={canRetryRender}
            />
          </form>

          <OutputDisplay
            statusText={statusText}
            videoUrl={videoUrl}
            aspectRatio={settings.aspectRatio}
            storyboard={storyboard}
            history={history}
            currentCaptions={currentCaptions}
            currentTranscript={currentTranscript}
            loadFromHistory={loadFromHistory}
            handleCopyCaptions={handleCopyCaptions}
            handleCopyTranscript={handleCopyTranscript}
            handleCreateAnother={handleCreateAnother}
            handleShareLink={handleShareCurrent}
          />
        </div>

        <section className="mt-12 pt-8 border-t border-zinc-100 space-y-6">
          <h2 className="text-lg font-medium text-zinc-900">Frequently Asked Questions</h2>
          <div className="grid gap-6 md:grid-cols-2 text-sm text-zinc-600">
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900">How do I use SolaraVideo?</p>
              <p className="leading-relaxed">Enter access key, upload audio/text, generate script, then render.</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900">Where is my data stored?</p>
              <p className="leading-relaxed">Audio and text are sent only to the configured AI providers. Recent renders are stored locally in your browser.</p>
            </div>
          </div>
        </section>

        <p className="pt-6 text-xs font-medium text-center text-zinc-400 uppercase tracking-widest">
          Powered by the SolaraPrompt Engine
        </p>
      </div>
    </main>
  );
}