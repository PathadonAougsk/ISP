"use client";

import Image from "next/image";
import type { Task } from "@/components/task";

export default function TaskOverview({ tasks }: { tasks: Task[] }) {
    const overviewCategories = [
        {
            name: "Report",
            chips: [
                {
                    label: "This week",
                    count: tasks.filter((task) => task.category_id === 1).length,
                    color: "bg-(--primary-red)",
                },
            ],
        },
        {
            name: "Project",
            chips: [
                {
                    label: "This week",
                    count: tasks.filter((task) => task.category_id === 2).length,
                    color: "bg-(--primary-yellow)",
                },
            ],
        },
    ];

    return (
        <div className="flex min-h-25 flex-1 flex-col gap-3 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
            <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
                <Image
                    src="/header_arrow_down.svg"
                    width={0}
                    height={0}
                    sizes="auto"
                    className="h-4 w-auto"
                    alt=""
                    draggable={false}
                />

                <h1 className="text-base font-bold text-white">
                    Task Overview
                </h1>
            </div>

            {tasks.length === 0 ? (
                <p className="flex flex-1 items-center justify-center py-4 text-center text-base font-medium text-gray-500">
                    All tasks are done! Time to enjoy a well-earned break.
                </p>
            ) : (
                overviewCategories.map((category) => {
                    const total = category.chips.reduce(
                        (sum, chip) => sum + chip.count,
                        0,
                    );

                    return (
                        <div
                            key={category.name}
                            className="flex h-15 rounded-2xl bg-white px-2 py-2"
                        >
                            <div className="flex w-6 shrink-0 items-center justify-start">
                                <Image
                                    src="/header_donut_green.svg"
                                    width={0}
                                    height={0}
                                    sizes="auto"
                                    className="h-4 w-auto"
                                    alt=""
                                    draggable={false}
                                />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div className="flex items-center gap-4">
                                    <p className="shrink-0 text-base font-bold text-black">
                                        {category.name}
                                    </p>

                                    <div className="flex min-w-0 items-center gap-4">
                                        {category.chips.map((chip) => (
                                            <div
                                                key={chip.label}
                                                className="flex items-center gap-2"
                                            >
                                                <span
                                                    className={`h-4 w-4 shrink-0 rounded-full ${chip.color}`}
                                                />

                                                <span className="text-base font-medium whitespace-nowrap text-black">
                                                    {chip.count} {chip.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                                    {category.chips.map((chip) => (
                                        <div
                                            key={chip.label}
                                            className={chip.color}
                                            style={{
                                                width: `${total > 0
                                                        ? (chip.count / total) * 100
                                                        : 0
                                                    }%`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
