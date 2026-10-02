"use client";

import Image from "next/image";
import { Fragment } from "react";
import type { CategoryMap } from "@/components/category";
import type { Account } from "@/lib/account";
import type { Task } from "@/components/task";
import { formatDueDate } from "@/lib/format";
import { dueBucketColor, getDueBucket } from "@/components/dashboard/due_bucket";

export default function TaskList({
    tasks,
    loadingTasks,
    categoryMap,
    usernames,
    currentAccount,
    onSelectTask,
}: {
    tasks: Task[];
    loadingTasks: boolean;
    categoryMap: CategoryMap;
    usernames: Record<string, string>;
    currentAccount: Account | null;
    onSelectTask: (task: Task) => void;
}) {
    const now = new Date();

    const sortedTasks =
        currentAccount !== null && currentAccount.role !== "Lab User"
            ? [...tasks].sort((a, b) => {
                const aAssigned = a.assignees.some((assignee) => assignee.id === currentAccount.id);
                const bAssigned = b.assignees.some((assignee) => assignee.id === currentAccount.id);

                if (aAssigned !== bAssigned) {
                    return aAssigned ? -1 : 1;
                }

                if (a.due_date === null && b.due_date === null) return 0;
                if (a.due_date === null) return 1;
                if (b.due_date === null) return -1;

                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            })
            : tasks;

    return (
        <div className="flex max-h-[calc(50%-4px)] min-h-0 flex-col gap-2">
            <div className="flex h-8 shrink-0 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
                <Image src="/header_donut_dark_green.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
                    <h1 className="truncate text-base font-bold text-white">Task Name</h1>
                    <h1 className="truncate text-base font-bold text-white">Created by</h1>
                    <h1 className="truncate text-base font-bold text-white">Category</h1>
                    <h1 className="truncate text-base font-bold text-white">Duedate</h1>
                </div>
            </div>

            {loadingTasks ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">Loading tasks...</p>
            ) : sortedTasks.length === 0 ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">Good job! You have completed all tasks.</p>
            ) : (
                <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                    {sortedTasks.map((task, index) => {
                        const previousIsAssigned =
                            index > 0 && sortedTasks[index - 1].assignees.some((assignee) => assignee.id === currentAccount?.id);
                        const isAssigned =
                            currentAccount !== null &&
                            currentAccount.role !== "Lab User" &&
                            task.assignees.some((assignee) => assignee.id === currentAccount.id);
                        const showMyTasksHeader = currentAccount !== null && currentAccount.role !== "Lab User" && index === 0 && isAssigned;
                        const showOtherTasksHeader = currentAccount !== null && currentAccount.role !== "Lab User" && !isAssigned && previousIsAssigned;

                        return (
                            <Fragment key={task.id}>
                                {showMyTasksHeader && <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">My tasks</h1>}
                                {showOtherTasksHeader && <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">Other tasks</h1>}
                                <div
                                    onClick={() => onSelectTask(task)}
                                    className="group flex h-8 shrink-0 cursor-pointer items-center gap-6 rounded-[20px] bg-white px-3 hover:bg-gray-100"
                                >
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${dueBucketColor[getDueBucket(task.due_date, now)]}`} />
                                    <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
                                        <p className="truncate text-sm text-black">{task.name}</p>
                                        <p className="truncate text-sm text-black">{usernames[task.created_by] ?? "-"}</p>
                                        <p className="truncate text-sm text-black">{categoryMap[task.category_id] ?? "-"}</p>
                                        <p className="text-sm text-black">{formatDueDate(task.due_date)}</p>
                                    </div>
                                </div>
                            </Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
