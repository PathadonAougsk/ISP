"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiSendJson } from "@/lib/api";
import { getAccounts, type Account } from "@/lib/account";
import { getCategories } from "@/lib/category";
import { formatShortDateTime } from "@/lib/format";
import { cached } from "@/lib/cache";

export type TaskStatus = "in_progress" | "completed" | (string & {});

// Shape returned by the backend
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
  due_date: string | null;
  completed_at: string | null;
  assignees: Account[];
};

export type TasksResponse = {
  Tasks: Task[];
};

export type TaskResponse = {
  Task: Task;
};

export type GetTasksParams = {
  id?: number;
  categories?: number;
  assignsTo?: string;
  status?: TaskStatus;
  limit?: number;
};

// Body for POST /task/ and PUT /task/{id} (mirrors TaskRequest in the backend)
export type TaskPayload = {
  name: string;
  category_id: number;
  description?: string | null;
  status?: TaskStatus;
  due_date?: string | null;
  assignees?: string[];
};

// Shape the request-table UI renders
export type TaskRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  assignedTo: string;
  createdBy: string;
  dueDate: string;
  createdDate: string;
  lastUpdate: string;
  status: "Completed" | "In_progress";
  categoryId: number;
  assigneeIds: string[];
};

export async function fetchTasks(
  params: GetTasksParams = {},
): Promise<TasksResponse> {
  const { id, categories, assignsTo, status, limit } = params;
  const query = new URLSearchParams();

  if (id !== undefined) query.set("id", String(id));
  if (categories !== undefined) query.set("categories", String(categories));
  if (assignsTo !== undefined) query.set("assignsTo", assignsTo);
  if (status !== undefined) query.set("status", status);
  if (limit !== undefined) query.set("limit", String(limit));

  const qs = query.toString();
  const res = await apiFetch(`/task/${qs ? `?${qs}` : ""}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export const getTasks = cached(fetchTasks, 0);

export async function postTask(body: TaskPayload): Promise<TaskResponse> {
  const res = await apiSendJson("/task/", "POST", body);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function putTask(
  id: number | string,
  body: TaskPayload,
): Promise<TaskResponse> {
  const res = await apiSendJson(`/task/${id}`, "PUT", body);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

function mapTaskStatus(status: TaskStatus): TaskRow["status"] {
  return status === "completed" ? "Completed" : "In_progress";
}

export function mapBackendTask(
  bt: Task,
  categoryById: Map<number, string>,
  accountById: Map<string, string>,
): TaskRow {
  return {
    id: String(bt.id),
    title: bt.name,
    description: bt.description ?? "",
    category: categoryById.get(bt.category_id) ?? `Category #${bt.category_id}`,
    assignedTo: bt.assignees.map((a) => a.username).join(", "),
    createdBy: accountById.get(bt.created_by) ?? bt.created_by,
    dueDate: formatShortDateTime(bt.due_date),
    createdDate: formatShortDateTime(bt.created),
    lastUpdate: formatShortDateTime(bt.updated),
    status: mapTaskStatus(bt.status),
    categoryId: bt.category_id,
    assigneeIds: bt.assignees.map((a) => a.id),
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [tasksReloadKey, setTasksReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        // Categories and accounts only add labels, so a failure there is tolerated
        const [taskBody, catBody, accBody] = await Promise.all([
          getTasks({
            limit: 50,
          }),
          getCategories().catch(() => null),
          getAccounts().catch(() => null),
        ]);

        const categoryById = new Map<number, string>(
          (catBody?.Categories ?? []).map((c) => [c.id, c.name]),
        );
        const accountById = new Map<string, string>(
          (accBody?.Accounts ?? []).map((a) => [a.id, a.username]),
        );

        if (!cancelled) {
          setTasks(
            taskBody.Tasks.map((t) =>
              mapBackendTask(t, categoryById, accountById),
            ),
          );
          setTasksError(null);
        }
      } catch (err) {
        if (!cancelled)
          setTasksError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [tasksReloadKey]);

  return { tasks, tasksLoading, tasksError, setTasksReloadKey };
}
