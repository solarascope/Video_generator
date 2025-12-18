import { useState } from "react";
import { RenderHistoryItem, StoryboardResponse } from "../../types";
import { PlayIcon, ExternalLinkIcon } from "./Icons";

interface OutputDisplayProps {
  statusText: string | null;
  videoUrl: string | null;
  aspectRatio: string;
  storyboard: StoryboardResponse | null;
  history: RenderHistoryItem[];
  currentCaptions: string | null;
  currentTranscript: string | null;
  loadFromHistory: (item: RenderHistoryItem) => void;
  handleCopyCaptions: () => void;
  handleCopyTranscript: () => void;
  handleCreateAnother: () => void;
  handleShareLink: () => void;
}

export default function OutputDisplay({
  statusText,
  videoUrl,
  aspectRatio,
  storyboard,
  history,
  currentCaptions,
  currentTranscript,
  loadFromHistory,
  handleCopyCaptions,
  handleCopyTranscript,
  handleCreateAnother,
  handleShareLink,
}: OutputDisplayProps) {
  const [recipeFilter, setRecipeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const availableRecipes = Array.from(
    new Set(history.map((h) => h.recipe).filter((r): r is string => Boolean(r))),
  );

  const now = new Date();
  const filteredHistory = history.filter((item) => {
    let ok = true;

    if (recipeFilter !== "all") {
      if (!item.recipe || item.recipe !== recipeFilter) {
        ok = false;
      }
    }

    if (ok && dateFilter !== "all" && item.createdAtISO) {
      const created = new Date(item.createdAtISO);
      if (dateFilter === "today") {
        ok = created.toDateString() === now.toDateString();
      } else if (dateFilter === "7d") {
        ok = now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }
    }

    return ok;
  });
  return (
    <div className="space-y-8 lg:border-l lg:border-zinc-200 lg:pl-10">

      {/* Section Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-900">Output & History</h2>
        <p className="text-sm text-zinc-500">
          View status, preview the video, and access your recent renders.
        </p>
      </div>

      {/* Status Bar */}
      {statusText && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-700 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          {statusText}
        </div>
      )}

      {/* Main Video Player */}
      <div className="bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/20 ring-1 ring-zinc-900/10 relative group">
        {videoUrl ? (
          <div className="relative">
            <video
              controls
              autoPlay
              muted
              playsInline
              src={videoUrl}
              className={`w-full bg-black ${aspectRatio === "9:16" ? "aspect-[9/16] max-w-[320px] mx-auto" : "aspect-video"}`}
            />
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={videoUrl}
                download
                className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-black/80 transition"
              >
                <ExternalLinkIcon /> Download MP4
              </a>
            </div>
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center text-zinc-500 space-y-3 bg-zinc-900/50">
            <div className="p-4 bg-white/5 rounded-full backdrop-blur-sm">
              <PlayIcon />
            </div>
            <span className="text-sm font-medium text-zinc-400">Preview will appear here</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {videoUrl && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopyCaptions}
            disabled={!currentCaptions}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50"
          >
            Copy Captions
          </button>
          <button
            type="button"
            onClick={handleCopyTranscript}
            disabled={!currentTranscript}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50"
          >
            Copy Transcript
          </button>
          <button
            type="button"
            onClick={handleCreateAnother}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            New Video
          </button>
          <button
            type="button"
            onClick={handleShareLink}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300"
          >
            Copy Share Link
          </button>
        </div>
      )}

      {/* Transcript Viewer */}
      {(currentCaptions || currentTranscript) && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
          {currentCaptions && (
            <div>
              <p className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">Captions</p>
              <p className="text-xs text-zinc-600 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed pr-2 font-mono">
                {currentCaptions}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced History List */}
      {history.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-zinc-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Recent Renders</h3>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">{filteredHistory.length}</span>
            </div>
            {(availableRecipes.length > 0 || history.some((h) => h.createdAtISO)) && (
              <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
                {history.some((h) => h.createdAtISO) && (
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900/10"
                  >
                    <option value="all">All dates</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                  </select>
                )}
                {availableRecipes.length > 0 && (
                  <select
                    value={recipeFilter}
                    onChange={(e) => setRecipeFilter(e.target.value)}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900/10"
                  >
                    <option value="all">All recipes</option>
                    {availableRecipes.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className="group relative flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-3 transition-all hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/50 cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-900/10">
                  <video
                    src={item.url + "#t=0.1"}
                    preload="metadata"
                    className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm group-hover:bg-white/40 transition">
                      <PlayIcon />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="truncate text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    {item.shareId && (
                      <a
                        href={`/v/${item.shareId}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-medium text-blue-600 hover:underline"
                      >
                        Open link
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      🕒 {item.createdAt}
                    </span>
                    <span className="h-3 w-px bg-zinc-300"></span>
                    <span>{item.type}</span>
                    {item.durationSeconds && (
                      <>
                        <span className="h-3 w-px bg-zinc-300"></span>
                        <span>{item.durationSeconds}s</span>
                      </>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.status === "error" ? "bg-red-100 text-red-700" :
                      item.status === "processing" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                    }`}>
                    {item.status || "Completed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}