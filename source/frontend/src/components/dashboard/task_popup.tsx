"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CategoryMap } from "@/components/category";
import type { Task } from "@/components/task";
import { createClient } from "@/lib/supabase/client";
import { renderWithLinks } from "@/components/dashboard/render_link";
import {
  PopupEdited,
  PopupFrame,
  PopupMeta,
  usePopupClose,
} from "@/components/dashboard/popup";

export default function TaskPopup({
  task,
  categoryMap,
  usernames,
  onClose,
}: {
  task: Task;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  onClose: () => void;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isClosing, handleClose } = usePopupClose(onClose);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) =>
        setCurrentUserId(session?.user.id ?? null),
      );
  }, []);

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
          categoryName={categoryMap[task.category_id] ?? "-"}
          dueDate={task.due_date}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/user.svg"
              width={0}
              height={0}
              sizes="auto"
              className="h-4 w-auto"
              alt=""
              draggable={false}
            />
            <span>{usernames[task.created_by] ?? "-"}</span>
          </div>
        </PopupMeta>

        <PopupEdited created={task.created} updated={task.updated} />

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
          {task.description ? (
            renderWithLinks(task.description)
          ) : (
            <span className="text-gray-400">No description</span>
          )}
        </div>
      </div>

      <div className="flex w-72 shrink-0 flex-col gap-2">
        <div className="flex h-7.5 w-full justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white hover:bg-gray-200"
            aria-label="Close"
          >
            <Image
              src="/close.svg"
              width={0}
              height={0}
              sizes="auto"
              className="h-auto w-5"
              alt=""
              draggable={false}
            />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] bg-(--panel-bg) p-3">
          <h1 className="text-base font-bold text-black">Responsible person</h1>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {sortedAssignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center gap-2">
                  <Image
                    src="/profile.svg"
                    width={0}
                    height={0}
                    sizes="auto"
                    className="h-5 w-auto shrink-0"
                    alt=""
                    draggable={false}
                  />
                  <span className="truncate text-base text-gray-700">
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
