import { apiFetch, apiSendJson } from "@/lib/api";
import type { Account } from "@/lib/account";
import { formatDueDate} from "@/lib/format";

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

export async function getTasks(
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
  // Trailing slash matches the FastAPI route and avoids a redirect
  const res = await apiFetch(`/task/${qs ? `?${qs}` : ""}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

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
    dueDate: formatDueDate(bt.due_date),
    createdDate: formatDueDate(bt.created),
    lastUpdate: formatDueDate(bt.updated),
    status: mapTaskStatus(bt.status),
    categoryId: bt.category_id,
    assigneeIds: bt.assignees.map((a) => a.id),
  };
}
