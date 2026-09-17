"use client";

import { apiFetch } from "@/lib/api";

export type AccountRole = "Lab Owner" | "Lab Admin" | "Lab user";

export type User = {
    id: string;
    username: string;
    email: string;
    role: AccountRole;
    quota: number | null;
    active: boolean;
};

export type UsersResponse = {
    Accounts: User[];
};

export async function getUsers(): Promise<UsersResponse> {
    const res = await apiFetch("/account/");

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}

export async function getUser(userId: string): Promise<User | undefined> {
    const { Accounts } = await getUsers();

    return Accounts.find((user) => user.id === userId);
}

export default function Users() {
    return <div></div>;
}
