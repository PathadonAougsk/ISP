import { apiFetch } from "@/lib/api";
import type { Account } from "@/lib/account";

export type TaskStatus = "in_progress" | "completed" | (string & {});

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
