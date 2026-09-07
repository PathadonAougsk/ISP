"use client";

import { useState } from "react";
import { setStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Mode = "signup" | "login";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToken(null);
    setLoading(true);

    const path = mode === "signup" ? "/auth/signup" : "/auth/login";
    const body = { email, password };

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      setToken(data.access_token);
      setStoredToken(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-white p-8 font-mono text-black">
      <div className="w-full max-w-sm border-2 border-dashed border-gray-400 p-6">
        <div className="mb-6 flex border-2 border-gray-400">
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); setToken(null); }}
            className={`flex-1 border-r-2 border-gray-400 py-2 text-sm uppercase tracking-wide ${
              mode === "signup" ? "bg-gray-800 text-white" : "bg-white text-gray-600"
            }`}
          >
            [ Sign Up ]
          </button>
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); setToken(null); }}
            className={`flex-1 py-2 text-sm uppercase tracking-wide ${
              mode === "login" ? "bg-gray-800 text-white" : "bg-white text-gray-600"
            }`}
          >
            [ Log In ]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs uppercase text-gray-600">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-2 border-gray-400 bg-white px-3 py-2 text-black outline-none focus:border-black"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs uppercase text-gray-600">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-2 border-gray-400 bg-white px-3 py-2 text-black outline-none focus:border-black"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 border-2 border-black bg-gray-800 py-2 text-sm uppercase tracking-wide text-white hover:bg-black disabled:opacity-50"
          >
            {loading ? "Working..." : mode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>

        {error && (
          <div className="mt-4 border-2 border-dashed border-red-500 p-3 text-xs text-red-600">
            [ ERROR ] {error}
          </div>
        )}
      </div>

      {token && (
        <div className="w-full max-w-2xl border-2 border-dashed border-gray-400 p-6 text-center">
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-500">
            JWT (debug)
          </div>
          <div className="break-all border-2 border-gray-300 bg-gray-50 p-4 text-sm text-black">
            {token}
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(token)}
            className="mt-3 border-2 border-black px-4 py-1 text-xs uppercase hover:bg-black hover:text-white"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
