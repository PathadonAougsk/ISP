"use client";

import { useState } from "react";
import type { Member } from "@/lib/account";
import type { CategoryMap } from "@/lib/category";
import { putTask, type Task } from "@/lib/task";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import { CloseButton, Slideup } from "@/components/ui/slideup";
import MemberPanel from "@/components/request-table/MemberPanel";
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
}: {
  task: Task;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  currentUserId: string | null;
  onClose: () => void;
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
    } catch {
      setError(`Failed to ${action}`);
    } finally {
      setSubmitting(false);
    }
  }

  const verb = isCompleted ? "Unsubmit" : "Submit";

  // panel want Member shape
  const members = task.assignees.map((a) => ({
    id: a.id,
    name: a.username,
    email: a.email,
    active: true,
  })) as Member[];

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
                  <Icon src="/account.svg" alt="" className="size-4" />
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

            <div className="flex min-w-55 w-1/4 shrink-0 flex-col">
              <MemberPanel
                readOnly
                title="Responsible person"
                members={members}
                selectedIds={[]}
                onChange={() => {}}
                className="w-full flex-1"
              />

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
