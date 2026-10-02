"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CategoryMap } from "@/components/category";
import type { Task } from "@/components/task";
import { createClient } from "@/lib/supabase/client";
import { formatFullDateTime } from "@/lib/format";
import { renderWithLinks } from "@/components/dashboard/_render_link";

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
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        createClient()
            .auth.getSession()
            .then(({ data: { session } }) => setCurrentUserId(session?.user.id ?? null));
    }, []);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const isEdited = task.updated !== task.created;

    const sortedAssignees = [...task.assignees].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.username.localeCompare(b.username);
    });

    return (
        <div className="fixed inset-0 z-50">
            <div className={`popup-overlay absolute inset-0 bg-black/60 ${isClosing ? "popup-overlay-closing" : ""}`} onClick={handleClose} />

            <div className={`popup-panel absolute bottom-0 left-[10%] flex h-[90%] w-[80%] gap-5 rounded-t-[30px] bg-white p-5 ${isClosing ? "popup-panel-closing" : ""}`}>
                <div className="flex min-w-0 flex-1 flex-col">
                    <h1 className="wrap-break-word text-3xl font-bold text-black">{task.name}</h1>

                    <div className="mt-2 flex flex-wrap items-center gap-x-12 gap-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Image src="/header_donut_gray.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                            <span>{categoryMap[task.category_id] ?? "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Image src="/clock.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                            <span>{formatFullDateTime(task.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Image src="/user.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                            <span>{usernames[task.created_by] ?? "-"}</span>
                        </div>
                    </div>

                    {isEdited && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-semibold italic">Edited</span>
                            <Image src="/clock.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                            <span>{formatFullDateTime(task.updated)}</span>
                        </div>
                    )}

                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
                        {task.description ? renderWithLinks(task.description) : <span className="text-gray-400">No description</span>}
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
                            <Image src="/close.svg" width={0} height={0} sizes="auto" className="h-auto w-5" alt="" draggable={false} />
                        </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] bg-(--panel-bg) p-3">
                        <h1 className="text-base font-bold text-black">Responsible person</h1>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                {sortedAssignees.map((assignee) => (
                                    <div key={assignee.id} className="flex items-center gap-2">
                                        <Image src="/profile.svg" width={0} height={0} sizes="auto" className="h-5 w-auto shrink-0" alt="" draggable={false} />
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
            </div>
        </div>
    );
}
