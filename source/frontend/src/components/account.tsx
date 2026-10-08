"use client";

import { getMe, type Account } from "@/lib/account";
import { useEffect, useState } from "react";

export function useCurrentAccount(enabled: boolean = true) {
    const [account, setAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!enabled) return;

        getMe()
            .then((found) => {
                setAccount(found ?? null);
            })
            .catch(() => {
                setAccount(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [enabled]);

    return { account, loading };
}
