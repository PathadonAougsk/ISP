"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const backgroundImageOpacity = 0.35;
const backgroundImageUrl =
  "https://photobay.ku.ac.th/img/thumbs/2023/06/30/20230630050558_8d8b6d60.webp";

// useSearchParams needs a Suspense boundary above it during prerender.
export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  // Set by getMe when the backend turns a deactivated account away, so they
  // are told why instead of just landing back here.
  const deactivated = useSearchParams().has("deactivated");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-full flex-1 flex-row items-center justify-center gap-10 overflow-hidden bg-white p-8 text-black">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("${backgroundImageUrl}")`,
          opacity: backgroundImageOpacity,
        }}
      />
      <div className="relative z-10 w-full max-w-sm rounded-[30px] bg-white p-8 shadow-2xl">
        <div className="mb-6 flex">
          <div
            className={
              "flex-1 py-2 text-sm tracking-wide bg-white text-gray-800 text-center"
            }
          >
            <h1 className="font-bold text-3xl">Welcome back!</h1>
            <div />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs uppercase text-gray-600">
            Email
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
            className="mt-2 bg-[#90C8AC] py-2 text-lg font-semibold text-white hover:bg-[#73A9AD] hover:text-black disabled:opacity-50 rounded-[30px]"
          >
            {loading ? "Working..." : "Login"}
          </button>
        </form>

        {deactivated && !error && (
          <div className="mt-4 border-2 border-dashed border-red-500 p-3 text-xs text-red-600">
            [ ERROR ] Your account has been deactivated. Ask a Lab Owner or Lab Admin to turn it back on.
          </div>
        )}

        {error && (
          <div className="mt-4 border-2 border-dashed border-red-500 p-3 text-xs text-red-600">
            [ ERROR ] {error}
          </div>
        )}
      </div>
    </div>
  );
}
