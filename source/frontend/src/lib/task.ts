"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import type { Account } from "@/lib/account";
import { formatShortDateTime, toDateInputValue } from "@/lib/format";
import { cached, withoutPagination } from "@/lib/cache/cache";
import { loadLookups, type Lookups } from "@/lib/lookup";
import { usePagedList } from "@/lib/paged-list";
import { buildQuery } from "@/lib/query";

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
  TaskCount?: number;
};

export type TaskResponse = {
  Task: Task;
};

export type GetTasksParams = {
  id?: number;
  search?: string;
  categories?: number;
  assignsTo?: string;
  notassignsTo?: string;
  status?: TaskStatus;
  due_after?: string;
  due_before?: string;
  get_count?: boolean;
  limit?: number;
  offset?: number;
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

// Body for PUT /task/{id} (TaskUpdate in the backend, every field optional)
export type TaskUpdatePayload = Partial<TaskPayload>;

// Shape the request-table UI renders
export type TaskRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  assignedTo: string;
  createdBy: string;
  dueDate: string;
  dueDateValue: string; // "yyyy-MM-dd" for <input type="date">, "" if none
  dueDateIso: string | null; // as stored, to send back when the field is untouched
  createdDate: string;
  lastUpdate: string;
  status: "Completed" | "In progress";
  categoryId: number;
  assigneeIds: string[];
};

async function fetchTasks(params: GetTasksParams = {}): Promise<TasksResponse> {
  const qs = buildQuery(params).toString();
  const res = await apiFetch(`/task/${qs ? `?${qs}` : ""}`);
  await apiOrThrow(res, `HTTP ${res.status}`);

  return res.json();
}

const TASKS_CACHE_TTL = 5 * 60 * 1000;

// same filters share expiration, different limits share the same family
export const getTasks = cached(
  fetchTasks,
  TASKS_CACHE_TTL,
  "tasks",
  withoutPagination,
  (result, limit) => ({
    ...result,
    Tasks: result.Tasks.slice(0, limit),
  }),
);

// data changed, so drop cached lists
async function sendTask(
  request: Promise<Response>,
  fallback: string,
): Promise<TaskResponse> {
  const res = await apiOrThrow(await request, fallback);
  getTasks.clear();

  return res.json();
}

export function postTask(body: TaskPayload): Promise<TaskResponse> {
  return sendTask(
    apiSendJson("/task/", "POST", body),
    "Could not create that task.",
  );
}

export function putTask(
  id: number | string,
  body: TaskUpdatePayload,
): Promise<TaskResponse> {
  return sendTask(
    apiSendJson(`/task/${id}`, "PUT", body),
    "Could not update that task.",
  );
}

function mapTask(task: Task, { categoryById, accountById }: Lookups): TaskRow {
  return {
    id: String(task.id),
    title: task.name,
    description: task.description ?? "",
    category:
      categoryById.get(task.category_id) ?? `Category #${task.category_id}`,
    assignedTo:
      task.assignees.map((a) => a.username).join(", ") || "Unassigned",
    createdBy: accountById.get(task.created_by) ?? "-",
    dueDate: formatShortDateTime(task.due_date),
    dueDateValue: toDateInputValue(task.due_date),
    dueDateIso: task.due_date,
    createdDate: formatShortDateTime(task.created, "created"),
    lastUpdate: formatShortDateTime(task.updated, "updated"),
    status: task.status === "completed" ? "Completed" : "In progress",
    categoryId: task.category_id,
    assigneeIds: task.assignees.map((a) => a.id),
  };
}

// fetch one task by id for the modal. throw if not found
export async function getTaskRowById(id: number): Promise<TaskRow> {
  const [body, lookups] = await Promise.all([getTasks({ id }), loadLookups()]);

  const task = body.Tasks.find((t) => t.id === id);
  if (!task) throw new Error("Task not found");

  return mapTask(task, lookups);
}

export type TaskFilters = {
  status?: TaskStatus;
  categoryId?: number;
  search?: string;
};

// one page of the task table
export function useTasks(page: number, filters: TaskFilters, enabled: boolean) {
  const { status, categoryId, search } = filters;

  const list = usePagedList(
    page,
    enabled,
    [status, categoryId, search],
    async (paging) => {
      const body = await getTasks({
        status,
        categories: categoryId,
        search,
        get_count: true,
        ...paging,
      });

      return { items: body.Tasks, count: body.TaskCount ?? 0 };
    },
    mapTask,
    "Failed to load tasks",
  );

  return {
    tasks: list.rows,
    tasksHasNext: list.hasNext,
    tasksTotalPages: list.totalPages,
    tasksLoading: list.loading,
    tasksError: list.error,
    reloadTasks: list.reload,
  };
}
