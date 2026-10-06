"use client";

import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import Icon from "@/components/icon";
import { isMissing } from "@/components/dashboard/due_bucket";
import {
  PopupCloseButton,
  PopupDescription,
  PopupEdited,
  PopupFrame,
  PopupMeta,
  usePopupClose,
} from "@/components/dashboard/popup";

export default function TaskPopup({
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
  const { isClosing, handleClose } = usePopupClose(onClose);

  const sortedAssignees = [...task.assignees].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <PopupFrame
      isClosing={isClosing}
      onClose={handleClose}
      className="flex gap-5"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="wrap-break-word text-3xl font-bold text-black">
          {task.name}
        </h1>

        <PopupMeta
          id={task.id}
          categoryName={categoryMap[task.category_id] ?? "-"}
          dueDate={task.due_date}
        >
          <div className="flex items-center gap-2">
            <Icon src="/user.svg" />
            <span>{usernames[task.created_by] ?? "-"}</span>
          </div>

          {isMissing(task.due_date, new Date()) && (
            <div className="flex h-6 items-center rounded-[20px] bg-(--primary-red) px-3 text-sm font-bold text-white">
              Missing
            </div>
          )}
        </PopupMeta>

        <PopupEdited created={task.created} updated={task.updated} />

        <PopupDescription description={task.description} />
      </div>

      <div className="flex w-72 shrink-0 flex-col gap-2">
        <div className="flex h-7.5 w-full justify-end">
          <PopupCloseButton onClose={handleClose} />
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] p-3 bg-(--panel-bg)`}
        >
          <h1 className="text-base font-bold text-black">Responsible person</h1>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {sortedAssignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center gap-2">
                  <Icon src="/profile.svg" className="h-5 w-auto shrink-0" />
                  <span className="truncate text-base font-medium text-gray-900">
                    {assignee.username}
                    {assignee.id === currentUserId && " (You)"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PopupFrame>
  );
}
