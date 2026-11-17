"use client";

import { useEffect, useState } from "react";
import { clearAllApiCache, clearExpiredApiCache } from "@/lib/cache/cache";
import { getMe } from "@/lib/account";

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
        await clearExpiredApiCache();

        if (cancelled) return;

        const account = await getMe();

        if (cancelled) return;

        if (!account) {
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
    return <div>Failed to initialize application. Please reload.</div>;
  }

  if (!ready) {
    return null;
  }

  return children;
}
