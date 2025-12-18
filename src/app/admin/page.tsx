'use client';

import { useEffect, useState, FormEvent } from "react";

type RenderProviderOption = "json2video" | "mock" | "runway";

interface AdminConfigResponse {
  hasJson2VideoApiKey: boolean;
  hasOpenAiApiKey: boolean;
  maxUploadBytes: number;
  maxRecordingSeconds: number;
  renderProvider: RenderProviderOption;
}

interface AdminConfigErrorResponse {
  error?: string;
}

interface AdminConfigUpdateBody {
  json2VideoApiKey?: string;
  openAiApiKey?: string;
  maxUploadBytes?: number;
  maxRecordingSeconds?: number;
  renderProvider?: RenderProviderOption;
}

export default function AdminPage() {
  const [config, setConfig] = useState<AdminConfigResponse | null>(null);
  const [json2VideoKey, setJson2VideoKey] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [maxUploadMb, setMaxUploadMb] = useState("25");
  const [maxRecordingSeconds, setMaxRecordingSeconds] = useState("90");
  const [renderProvider, setRenderProvider] = useState<RenderProviderOption>("json2video");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/config");
        const raw = (await res.json()) as AdminConfigResponse | AdminConfigErrorResponse;
        if (cancelled) return;
        if (!res.ok) {
          const message = (raw as AdminConfigErrorResponse).error || "Failed to load admin configuration";
          throw new Error(message);
        }

        const data = raw as AdminConfigResponse;
        setConfig(data);
        setMaxUploadMb(String(Math.round(data.maxUploadBytes / (1024 * 1024))));
        setMaxRecordingSeconds(String(data.maxRecordingSeconds));
        setRenderProvider(data.renderProvider);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load admin configuration.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const body: AdminConfigUpdateBody = {};

      if (json2VideoKey.trim()) {
        body.json2VideoApiKey = json2VideoKey.trim();
      }
      if (openAiKey.trim()) {
        body.openAiApiKey = openAiKey.trim();
      }

      const uploadMb = parseFloat(maxUploadMb);
      if (!Number.isNaN(uploadMb) && uploadMb > 0) {
        body.maxUploadBytes = Math.floor(uploadMb * 1024 * 1024);
      }

      const recordingSec = parseInt(maxRecordingSeconds, 10);
      if (!Number.isNaN(recordingSec) && recordingSec > 0) {
        body.maxRecordingSeconds = recordingSec;
      }

      if (renderProvider) {
        body.renderProvider = renderProvider;
      }

      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as AdminConfigResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      setConfig(data);
      setSuccess("Settings saved. New configuration will apply to future requests.");
      setJson2VideoKey("");
      setOpenAiKey("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save configuration.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl mx-auto rounded-2xl bg-white shadow-xl border border-zinc-200/80 p-6 md:p-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-950">
            SolaraVideo – Admin Settings
          </h1>
          <p className="text-sm md:text-base text-zinc-600 max-w-2xl">
            Configure API keys, limits, and the active video renderer. Changes apply to future video generations.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-zinc-600">Loading settings…</p>
        )}

        {!loading && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">API Keys</h2>
                <p className="text-xs text-zinc-600">
                  Keys are stored securely on the server. For security reasons, existing values are not shown.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">JSON2Video API key</label>
                <input
                  type="password"
                  value={json2VideoKey}
                  onChange={(e) => setJson2VideoKey(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder={config?.hasJson2VideoApiKey ? "Key is configured – enter to replace" : "Enter JSON2Video API key"}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">OpenAI API key</label>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder={config?.hasOpenAiApiKey ? "Key is configured – enter to replace" : "Enter OpenAI API key"}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Limits</h2>
                <p className="text-xs text-zinc-600">
                  These limits apply to new uploads and recordings in the video generator UI.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">Maximum upload size (MB)</label>
                  <input
                    type="number"
                    min={1}
                    value={maxUploadMb}
                    onChange={(e) => setMaxUploadMb(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">Maximum recording length (seconds)</label>
                  <input
                    type="number"
                    min={5}
                    value={maxRecordingSeconds}
                    onChange={(e) => setMaxRecordingSeconds(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Renderer</h2>
                <p className="text-xs text-zinc-600">
                  Select which renderer SolaraVideo should use by default.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">Active renderer</label>
                <select
                  value={renderProvider}
                  onChange={(e) => setRenderProvider(e.target.value as RenderProviderOption)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="json2video">JSON2Video</option>
                  <option value="mock">Mock / Dev renderer</option>
                  <option value="runway">RunwayML (future)</option>
                </select>
              </div>
            </section>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100">{success}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
