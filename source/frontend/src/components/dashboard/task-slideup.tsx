"use client";

import { useState } from "react";
import type { CategoryMap } from "@/lib/category";
import { putTask, type Task } from "@/lib/task";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import { CloseButton, Slideup } from "@/components/ui/slideup";
import {
  RequestTableButton,
  SlideupDescription,
  SlideupDueRow,
  SlideupEdited,
  SlideupError,
  SlideupMeta,
} from "@/components/dashboard/dashboard-utils";

export default function TaskSlideup({
  task,
  categoryMap,
  usernames,
  currentUserId,
  onClose,
  onUpdated,
}: {
  task: Task;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  currentUserId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  // local copy, task prop never change after putTask
  const [status, setStatus] = useState(task.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAssignedToMe = task.assignees.some((a) => a.id === currentUserId);
  const isCompleted = status === "completed";

  async function handleToggle() {
    const next = isCompleted ? "in_progress" : "completed";
    const action = isCompleted ? "unsubmit" : "submit";

    setError(null);
    setSubmitting(true);

    try {
      await putTask(task.id, { status: next });

      setStatus(next);
      onUpdated();
    } catch {
      setError(`Failed to ${action}`);
    } finally {
      setSubmitting(false);
    }
  }

  const verb = isCompleted ? "Unsubmit" : "Submit";

  const sortedAssignees = [...task.assignees].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <Slideup onClose={onClose}>
      {(close) => (
        <>
          <div className="flex items-center justify-between gap-4 pb-2">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold text-black">Task</h1>
              <h1 className="text-xl font-semibold text-gray-500">
                #{task.id}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <RequestTableButton
                type="task"
                id={task.id}
                label="Open in Request-table"
              />
              <CloseButton onClose={close} />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="wrap-break-word text-xl font-bold text-black">
                {renderWithLinks(task.name)}
              </h1>

              <SlideupMeta
                categoryName={categoryMap[task.category_id] ?? "-"}
                createdDate={task.created}
              >
                <div className="flex items-center gap-2">
                  <Icon src="/account.svg" alt="" className="h-4 w-auto" />
                  <span>{usernames[task.created_by] ?? "-"}</span>
                </div>
              </SlideupMeta>

              <SlideupEdited created={task.created} updated={task.updated} />

              <SlideupDueRow
                type="task"
                status={status}
                dueDate={task.due_date}
              />

              <SlideupDescription description={task.description} />
            </div>

            <div className="flex w-9/40 shrink-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] bg-(--panel-bg) p-3">
                <h1 className="text-base font-bold text-black">
                  Responsible person
                </h1>

                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                  <div className="flex flex-col gap-2">
                    {sortedAssignees.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="flex items-center gap-2"
                      >
                        <Avatar
                          name={assignee.username}
                          className="h-5 w-auto shrink-0"
                        />
                        <span className="truncate text-base font-normal text-gray-800">
                          {assignee.username}
                          {assignee.id === currentUserId && " (You)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <SlideupError message={error} className="mt-2 text-center" />
              )}

              {isAssignedToMe && (
                <Button
                  variant={submitting ? "busy" : isCompleted ? "red" : "green"}
                  disabled={submitting}
                  onClick={handleToggle}
                  className="mt-2 h-10 w-full text-lg font-bold"
                >
                  {submitting ? `${verb}ting` : verb}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Slideup>
  );
}
