"use client";

import { useEffect } from "react";
import { initializeApiCache } from "@/lib/cache/cache";

export default function CacheInitializer() {
  useEffect(() => {
    void initializeApiCache();
  }, []);

  return null;
}
