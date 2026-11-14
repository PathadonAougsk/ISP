"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "bg-(--panel-bg) px-3 py-2 text-black outline-none border border-(--panel-bg-hover) rounded-xl focus:border-(--primary-color-1)";

const labelClass = "flex flex-col gap-1 text-base text-(--primary-color-deep)";

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
    <div className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-white p-8 text-black">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("https://photobay.ku.ac.th/img/thumbs/2023/06/30/20230630050558_8d8b6d60.webp")`,
          opacity: 0.35,
        }}
      />
      <div className="relative z-10 w-full max-w-sm rounded-[30px] bg-white p-8 shadow-2xl">
        <div className="mb-6 py-4 text-center">
          <h1 className="text-3xl font-bold">Welcome Back!</h1>
          <p className="text-xs text-(--primary-color-deep)">
            Enter your credentials below to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="email" className={labelClass}>
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="user@example.com"
            />
          </label>

          <label htmlFor="password" className={labelClass}>
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-(--primary-color-2) py-2 text-white text-lg font-semibold hover:bg-(--primary-color-2-hover) disabled:opacity-50 rounded-[30px]"
          >
            {loading ? "Working..." : "Login"}
          </button>
        </form>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            deactivated || error
              ? "mt-4 max-h-32 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          {error ? (
            <div
              role="alert"
              className="border-2 border-(--primary-red) bg-(--primary-red)/10 p-3 text-sm text-(--primary-red)"
            >
              The email or password you entered is incorrect. If you need to
              reset your credentials, please contact your Lab Owner.
            </div>
          ) : (
            deactivated && (
              <div
                role="alert"
                className="border-2 border-dashed border-(--primary-red) bg-(--primary-red)/10 p-3 text-sm text-(--primary-red)"
              >
                Your account has been deactivated. Ask a Lab Owner or Lab Admin
                to turn it back on.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
