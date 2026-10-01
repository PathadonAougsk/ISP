"use client";

import { getMe, type Account } from "@/lib/account";
import { useEffect, useState } from "react";

// Resolves the signed in user against the account table, which is where the
// username lives - the Supabase access token only carries the id and email.
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

export default function Acoounts() {
    return <div></div>;
}
