"use client";

import Image from "next/image";
import type { Task } from "@/components/task";
import { categoryMap, getDueBucket, type DueBucketKey } from "../../app/(contents)/dashboard/page";

const bucketMeta: { key: DueBucketKey; label: string; color: string }[] = [
    { key: "thisWeek", label: "This week", color: "bg-(--primary-red)" },
    { key: "nextWeek", label: "Next week", color: "bg-(--primary-yellow)" },
    { key: "later", label: "Later", color: "bg-(--primary-blue)" },
];

export default function TaskOverview({ tasks, loadingTasks }: { tasks: Task[]; loadingTasks: boolean }) {
    const now = new Date();

    const grouped = tasks.reduce<Record<number, Record<DueBucketKey, number>>>((acc, task) => {
        const bucket = getDueBucket(task.due_date, now);
        if (!acc[task.category_id]) acc[task.category_id] = { thisWeek: 0, nextWeek: 0, later: 0 };
        acc[task.category_id][bucket] += 1;
        return acc;
    }, {});

    const categoryIds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    return (
        <div className="flex min-h-25 flex-1 flex-col gap-3 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
            <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
                <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <h1 className="text-base font-bold text-white">Task Overview</h1>
            </div>

            {loadingTasks ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">Loading tasks...</p>
            ) : tasks.length === 0 ? (
                <p className="flex flex-1 items-center justify-center py-4 text-center text-base font-medium text-gray-500">
                    All tasks are done! Time to enjoy a well-earned break.
                </p>
            ) : (
                categoryIds.map((id) => {
                    const counts = grouped[id];
                    const total = counts.thisWeek + counts.nextWeek + counts.later;
                    const visibleBuckets = bucketMeta.filter((b) => counts[b.key] > 0);

                    return (
                        <div key={id} className="flex h-15 rounded-2xl bg-white px-2 py-2">
                            <div className="flex w-6 shrink-0 items-center justify-start">
                                <Image src="/header_donut_green.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div className="flex items-center gap-4">
                                    <p className="shrink-0 text-base font-bold text-black">{categoryMap[id] ?? `Category ${id}`}</p>
                                    <div className="flex min-w-0 items-center gap-4">
                                        {visibleBuckets.map((b) => (
                                            <div key={b.key} className="flex items-center gap-2">
                                                <span className={`h-4 w-4 shrink-0 rounded-full ${b.color}`} />
                                                <span className="text-base font-medium whitespace-nowrap text-black">{counts[b.key]} {b.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                                    {bucketMeta.map((b) =>
                                        counts[b.key] > 0 ? (
                                            <div key={b.key} className={b.color} style={{ width: `${total > 0 ? (counts[b.key] / total) * 100 : 0}%` }} />
                                        ) : null
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
