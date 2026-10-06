"use client";

import { useEffect, useState } from "react";
import { getAccounts } from "@/lib/account";
import { getCategories } from "@/lib/category";
import { getTasks, mapBackendTask, type TaskRow } from "@/lib/task";

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
