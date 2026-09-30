"use client";

import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export type AccountRole = "Lab Owner" | "Lab Admin" | "Lab user";

export type Account = {
    id: string;
    username: string;
    email: string;
    role: AccountRole;
    quota: number | null;
    active: boolean;
};

export type AccountsResponse = {
    Accounts: Account[];
};

export async function getAccounts(): Promise<AccountsResponse> {
    const res = await apiFetch("/account/");

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}

export async function getAccount(userId: string): Promise<Account | undefined> {
    const { Accounts } = await getAccounts();

    return Accounts.find((user) => user.id === userId);
}

export async function getCurrentAccount(): Promise<Account | undefined> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) return undefined;

    const { Accounts } = await getAccounts();

    return (
        Accounts.find((user) => user.id === session.user.id) ??
        Accounts.find((user) => user.email === session.user.email)
    );
}

export default function Acoounts() {
    return <div></div>;
}
