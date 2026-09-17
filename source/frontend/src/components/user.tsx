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
    Users: User[];
};

export async function getUsers(): Promise<UsersResponse> {
    const res = await apiFetch("/user");

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}

export async function getUser(userId: string): Promise<User | undefined> {
    const { Users } = await getUsers();

    return Users.find((user) => user.id === userId);
}

export default function Users() {
    return <div></div>;
}
