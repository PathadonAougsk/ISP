"use client";

import type { Task } from "@/components/task";
import { getDueBucket } from "../../app/(contents)/dashboard/page";

const bucketMeta = [
    { key: "thisWeek", label: "This week", color: "bg-(--primary-red)" },
    { key: "nextWeek", label: "Next week", color: "bg-(--primary-yellow)" },
    { key: "later", label: "Later", color: "bg-(--primary-blue)" },
] as const;

export default function ActiveTask({ tasks, loadingTasks }: { tasks: Task[]; loadingTasks: boolean }) {
    const now = new Date();
    const dueToday = tasks.filter((task) => {
        const due = new Date(task.due_date);
        return due.getUTCFullYear() === now.getUTCFullYear()
            && due.getUTCMonth() === now.getUTCMonth()
            && due.getUTCDate() === now.getUTCDate();
    }).length;

    const counts = tasks.reduce<Record<string, number>>((acc, task) => {
        const bucket = getDueBucket(task.due_date, now);
        acc[bucket] = (acc[bucket] ?? 0) + 1;
        return acc;
    }, {});

    const dueBuckets = bucketMeta.map((bucket) => ({
        ...bucket,
        count: counts[bucket.key] ?? 0,
    }));

    return (
        <div className="flex h-25 w-full gap-5">
            <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[30px] bg-(--panel-bg) p-0">
                <div className="flex flex-1 flex-col items-center justify-center gap-1">
                    <h1 className="text-lg font-bold text-black">Due Today</h1>
                    <h1 className="text-5xl font-extrabold text-black">
                        {loadingTasks ? "-" : dueToday}
                    </h1>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center gap-1">
                    <h1 className="text-lg font-bold text-black">Active Task</h1>
                    <h1 className="text-5xl font-extrabold text-black">
                        {loadingTasks ? "-" : tasks.length}
                    </h1>
                </div>
            </div>

            <div className="flex w-fit shrink-0 flex-col pr-5">
                <div className="flex items-start text-base font-bold text-black">
                    <p>Due Tasks</p>
                </div>

                <div className="flex flex-1">
                    <div className="flex w-7.5 items-start">
                        <div className="flex h-full w-5 overflow-hidden rounded-[20px] bg-(--panel-bg)">
                            {!loadingTasks && (
                                <div className="flex h-full w-full flex-col">
                                    {dueBuckets.map((bucket) => (
                                        <div
                                            key={bucket.label}
                                            className={`w-full ${bucket.color}`}
                                            style={{ flexGrow: bucket.count }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between text-lg font-medium text-black">
                        {dueBuckets.map((bucket) => (
                            <div key={bucket.label} className="flex items-center">
                                <div className="flex w-7.5 items-center">
                                    <div className={`h-5 w-5 rounded-full ${bucket.color}`} />
                                </div>
                                <div className="flex w-5 items-center text-base">
                                    <p>{loadingTasks ? "-" : bucket.count}</p>
                                </div>
                                <div className="flex flex-1 items-center text-base">
                                    <p>{bucket.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
