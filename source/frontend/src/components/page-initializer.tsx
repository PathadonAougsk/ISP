"use client";

import { useEffect, useState } from "react";
import { clearAllApiCache } from "@/lib/cache/cache";
import { getMe, isSessionEnding } from "@/lib/account";
import Button from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

export default function PageInitializer({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const account = await getMe();

        if (cancelled) return;

        if (!account) {
          // getMe already sent them to /auth with a reason
          if (isSessionEnding()) return;

          await clearAllApiCache();

          if (!cancelled) {
            window.location.replace("/auth");
          }

          return;
        }

        setReady(true);
      } catch (err) {
        console.warn("Application initialization failed:", err);

        if (!cancelled) {
          setError(true);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="flex h-full w-full flex-col items-center justify-center gap-4"
      >
        <p className="text-lg font-semibold text-red-700">
          Failed to initialize application.
        </p>
        <Button
          variant="green"
          size="lg"
          onClick={() => window.location.reload()}
          className="font-semibold"
        >
          Reload
        </Button>
      </div>
    );
  }

  if (!ready) {
    return null;
  }

  return children;
}
