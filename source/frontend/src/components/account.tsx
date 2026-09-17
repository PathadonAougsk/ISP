"use client";

import { apiFetch } from "@/lib/api";

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

export default function Acoounts() {
    return <div></div>;
}
