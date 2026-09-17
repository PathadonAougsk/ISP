"use client";

import type { Task } from "@/components/task";

const dueToday = 1;

const dueBuckets = [
    { label: "This week", count: 2, color: "bg-(--primary-red)" },
    { label: "Next week", count: 4, color: "bg-(--primary-yellow)" },
    { label: "Later", count: 3, color: "bg-(--primary-blue)" },
];

export default function ActiveTask({ tasks }: { tasks: Task[] }) {
    return (
        <div className="flex h-25 w-full gap-5">
            <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[30px] bg-(--panel-bg) p-0">
                <div className="flex flex-1 flex-col items-center justify-center gap-1">
                    <h1 className="text-lg font-bold text-black">Due Today</h1>
                    <h1 className="text-5xl font-extrabold text-black">{dueToday}</h1>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center gap-1">
                    <h1 className="text-lg font-bold text-black">Active Task</h1>
                    <h1 className="text-5xl font-extrabold text-black">{tasks.length}</h1>
                </div>
            </div>

            <div className="flex w-fit shrink-0 flex-col pr-5">
                <div className="flex items-start text-base font-bold text-black">
                    <p>Due Tasks</p>
                </div>

                <div className="flex flex-1">
                    <div className="flex w-7.5 items-start">
                        <div className="flex h-full w-5 flex-col overflow-hidden rounded-[20px]">
                            {dueBuckets.map((bucket) => (
                                <div key={bucket.label} className={`w-full ${bucket.color}`} style={{ flexGrow: bucket.count }} />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between text-lg font-medium text-black">
                        {dueBuckets.map((bucket) => (
                            <div key={bucket.label} className="flex items-center">
                                <div className="flex w-7.5 items-center">
                                    <div className={`h-5 w-5 rounded-full ${bucket.color}`} />
                                </div>
                                <div className="flex w-5 items-center text-base"><p>{bucket.count}</p></div>
                                <div className="flex flex-1 items-center text-base"><p>{bucket.label}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
