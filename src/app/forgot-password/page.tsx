'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetToken(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json().catch(() => null)) as
        | { message?: string; resetToken?: string; error?: string }
        | null;

      if (!res.ok) {
        throw new Error((data && data.error) || "Failed to request password reset.");
      }

      setMessage(
        data?.message || "If an account exists for this email, a reset link has been created.",
      );
      if (data?.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request password reset.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-zinc-100 p-8 space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Reset your password
          </h1>
          <p className="text-sm text-zinc-600">
            Enter your email address. If an account exists, you will receive a reset link.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-800" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900/50"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          {resetToken && (
            <div className="space-y-1 text-[11px] text-zinc-500 break-all bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
              <p className="font-medium text-zinc-700">Developer reset token</p>
              <p>{resetToken}</p>
              <p>
                Use this token on the reset page or include it as the <code>?token=</code> query
                parameter in the URL.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 text-white text-sm font-medium py-2.5 shadow-sm hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full text-xs text-zinc-500 hover:text-zinc-800"
        >
          Back to login
        </button>
      </div>
    </main>
  );
}
