'use client';

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, authLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, workspaceName || undefined);
      }
      router.push("/");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-zinc-100 p-8 space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {mode === "login" ? "Log in to SolaraVideo" : "Create your SolaraVideo account"}
          </h1>
          <p className="text-sm text-zinc-600">
            Use your email and password. Each account has its own workspace and branding.
          </p>
        </header>

        <div className="flex gap-2 text-xs font-medium rounded-full bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full py-1.5 transition-colors ${
              mode === "login" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full py-1.5 transition-colors ${
              mode === "register" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
            }`}
          >
            Register
          </button>
        </div>

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

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-800" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900/50"
            />
          </div>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-xs text-zinc-500 hover:text-zinc-800 text-right w-full"
            >
              Forgot your password?
            </button>
          )}

          {mode === "register" && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-800" htmlFor="workspaceName">
                Workspace / Brand name
              </label>
              <input
                id="workspaceName"
                type="text"
                placeholder="e.g. Solara Studio"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900/50"
              />
              <p className="text-xs text-zinc-500">If left blank, we will generate a simple workspace name from your email.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 text-white text-sm font-medium py-2.5 shadow-sm hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="text-[11px] text-zinc-500 text-center pt-2">
          After logging in, go to the main page and enter your access key to start generating videos.
        </p>
      </div>
    </main>
  );
}
