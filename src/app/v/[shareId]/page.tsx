import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { SharedVideo } from "@/lib/models/SharedVideo";

interface PublicVideoPageProps {
  params: Promise<{ shareId: string }>;
}

export const dynamic = "force-dynamic";

export default async function PublicVideoPage(props: PublicVideoPageProps) {
  const { shareId } = await props.params;

  if (!shareId || typeof shareId !== "string") {
    notFound();
  }

  await connectToDatabase();

  const doc = await SharedVideo.findOne({ shareId }).lean();
  if (!doc) {
    notFound();
  }

  const title = doc.title || "Shared video";
  const captions = doc.captions || "";
  const aspectRatio = doc.aspectRatio || "16:9";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-zinc-100 p-6 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 truncate">
            {title}
          </h1>
          <p className="text-xs text-zinc-500">Shared from SolaraVideo</p>
        </header>

        <div className="bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/20 ring-1 ring-zinc-900/10">
          <video
            src={doc.videoUrl}
            controls
            playsInline
            className={`w-full bg-black ${aspectRatio === "9:16" ? "aspect-[9/16] max-w-[320px] mx-auto" : aspectRatio === "1:1" ? "aspect-square" : "aspect-video"}`}
          />
        </div>

        {captions && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
              Caption / Hashtags
            </h2>
            <p className="text-xs text-zinc-700 whitespace-pre-line bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              {captions}
            </p>
          </section>
        )}

        <footer className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Made with SolaraVideo</span>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 bg-white shadow-sm"
          >
            Try the generator
          </Link>
        </footer>
      </div>
    </main>
  );
}
