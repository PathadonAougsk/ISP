"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body = { email, password };

    try {
      const res = await fetch(`${API_URL}${"/auth/login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-row h-full items-center justify-center gap-10 bg-white p-8 font-mono text-black">
      <div className="w-full max-w-sm shadow-2xl rounded-md p-6">
        <div className="mb-6 flex">
         <div
            className={"flex-1 py-2 text-sm uppercase tracking-wide bg-white text-gray-600 text-center"}
          >
             <h1 className="font-semibold text-xl">Welcome back!</h1>
          <div/>
        </div>
      </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs uppercase text-gray-600">
            Username
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white px-3 py-2 text-black outline-none "
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
              className="bg-white px-3 py-2 text-black outline-none focus:border-black"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 border-2 border-black bg-gray-800 py-2 text-sm uppercase tracking-wide text-white hover:bg-black disabled:opacity-50"
          >
            {loading ? "Working..." : "Log In"}
          </button>
        </form>

        {error && (
          <div className="mt-4 border-2 border-dashed border-red-500 p-3 text-xs text-red-600">
            [ ERROR ] {error}
          </div>
        )}
      </div>
    </div>
  );
}
