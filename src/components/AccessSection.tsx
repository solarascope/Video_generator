import { AccessStatus } from "../../types";

interface AccessSectionProps {
  accessKey: string;
  setAccessKey: (key: string) => void;
  accessStatus: AccessStatus;
  accessStatusMessage: string | null;
  checkingAccess: boolean;
  onValidate: () => void;
}

export default function AccessSection({
  accessKey,
  setAccessKey,
  accessStatus,
  accessStatusMessage,
  checkingAccess,
  onValidate
}: AccessSectionProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-800">Access Key</p>
        <p className="text-xs text-zinc-600">
          {accessStatus === "valid"
            ? accessStatusMessage || "Access granted. You can generate videos."
            : accessStatusMessage || "Enter your access key to unlock SolaraVideo."}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="password"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
          disabled={checkingAccess}
          placeholder="Enter access key"
          className="w-full sm:w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onValidate}
          disabled={checkingAccess || !accessKey.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checkingAccess ? "Checking…" : "Unlock"}
        </button>
      </div>
    </section>
  );
}