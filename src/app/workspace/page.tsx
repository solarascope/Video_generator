'use client';

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type WorkspaceSummary } from "@/components/AuthProvider";

export default function WorkspacePage() {
  const router = useRouter();
  const { workspace, token, isAuthenticated, authLoading, refreshWorkspace } = useAuth();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [defaultStyle, setDefaultStyle] = useState("");
  const [defaultAspectRatio, setDefaultAspectRatio] = useState("");
  const [defaultRecipe, setDefaultRecipe] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name ?? "");
    setLogoUrl(workspace.logoUrl ?? "");
    setPrimaryColor(workspace.primaryColor ?? "");
    setSecondaryColor(workspace.secondaryColor ?? "");
    setDefaultStyle(workspace.defaultStyle ?? "");
    setDefaultAspectRatio(workspace.defaultAspectRatio ?? "");
    setDefaultRecipe(workspace.defaultRecipe ?? "");
  }, [workspace]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("You must be logged in to update workspace settings.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const body: Record<string, string> = {
        name: name.trim() || "",
        logoUrl: logoUrl.trim(),
        primaryColor: primaryColor.trim(),
        secondaryColor: secondaryColor.trim(),
        defaultStyle: defaultStyle.trim(),
        defaultAspectRatio: defaultAspectRatio.trim(),
        defaultRecipe: defaultRecipe.trim(),
      };

      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => null)) as (WorkspaceSummary & { error?: string }) | null;
      if (!res.ok || !data) {
        throw new Error((data && data.error) || "Failed to update workspace.");
      }

      const updated: WorkspaceSummary = {
        id: data.id,
        name: data.name,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        defaultStyle: data.defaultStyle,
        defaultAspectRatio: data.defaultAspectRatio,
        defaultRecipe: data.defaultRecipe,
        videoCount: data.videoCount,
      };

      refreshWorkspace(updated);
      setSuccess("Workspace settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace.");
    } finally {
      setSaving(false);
    }
  };

  const showLoading = authLoading || (!workspace && isAuthenticated);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-zinc-100 p-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Workspace settings</h1>
          <p className="text-sm text-zinc-600">
            Manage your brand name, logo and default video settings for SolaraVideo.
          </p>
        </header>

        {showLoading && <p className="text-sm text-zinc-500">Loading workspace…</p>}

        {!showLoading && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Brand</h2>
                <p className="text-xs text-zinc-600">These details appear in the app and can be used for future white-labeling.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">Workspace / brand name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="e.g. Solara Studio"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">Logo URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="https://…/logo.png"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700">Primary color (hex)</label>
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="#111827"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700">Secondary color (hex)</label>
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="#4b5563"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Default video settings</h2>
                <p className="text-xs text-zinc-600">These defaults are pre-filled on the main generator page.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">Default style</label>
                <input
                  type="text"
                  value={defaultStyle}
                  onChange={(e) => setDefaultStyle(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="e.g. Professional, TikTok, Vlog"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700">Default aspect ratio</label>
                  <select
                    value={defaultAspectRatio}
                    onChange={(e) => setDefaultAspectRatio(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="">Use app default</option>
                    <option value="16:9">16:9 – Landscape</option>
                    <option value="9:16">9:16 – Vertical</option>
                    <option value="1:1">1:1 – Square</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700">Default recipe / preset</label>
                  <input
                    type="text"
                    value={defaultRecipe}
                    onChange={(e) => setDefaultRecipe(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="Optional internal preset name"
                  />
                </div>
              </div>
            </section>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">{success}</p>}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                Back to generator
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save workspace"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
