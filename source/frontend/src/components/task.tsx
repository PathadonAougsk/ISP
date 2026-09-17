"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

export type TaskStatus = "in_progress" | "completed" | (string & {});

export type AccountRole = "Lab Owner" | "Lab Admin" | "Lab user";

export type Account = {
    id: string;
    username: string;
    email: string;
    role: AccountRole;
    quota: number | null;
    active: boolean;
};

export type Task = {
    id: number;
    status: TaskStatus;
    name: string;
    description: string | null;
    category_id: number;
    created_by: string;
    completed_by: string | null;
    created: string;
    updated: string;
    due_date: string;
    completed_at: string | null;
    assignees: Account[];
};

export type TasksResponse = {
    Tasks: Task[];
};

export type GetTasksParams = {
    id?: number;
    categories?: number;
    assignsTo?: string;
    status?: TaskStatus;
    limit?: number;
};

export async function getTasks(
    params: GetTasksParams = {},
): Promise<TasksResponse> {
    const { id, categories, assignsTo, status, limit } = params;
    const query = new URLSearchParams();

    if (id !== undefined) {
        query.set("id", String(id));
    }

    if (categories !== undefined) {
        query.set("categories", String(categories));
    }

    if (assignsTo !== undefined) {
        query.set("assignsTo", assignsTo);
    }

    if (status !== undefined) {
        query.set("status", status);
    }

    if (limit !== undefined) {
        query.set("limit", String(limit));
    }

    const qs = query.toString();
    const res = await apiFetch(`/task${qs ? `?${qs}` : ""}`);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        getTasks()
            .then((body) => {
                setTasks(body.Tasks);
                console.log(body.Tasks);
            })
            .catch(() => {
                setTasks([]);
            });
    }, []);

    return <div></div>;
}
