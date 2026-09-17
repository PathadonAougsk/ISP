"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getUser } from "@/components/user";
import type { Task } from "@/components/task";
import type { Ticket } from "@/components/ticket";
import { categoryMap } from "./page";

const ticketStatusText: Record<string, string> = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };
const ticketStatusIcon: Record<string, string> = { pending: "/pending.svg", accepted: "/accepted.svg", rejected: "/rejected.svg" };

function formatDueDate(iso: string | null) {
    if (iso === null) return "No duedate";
    const d = new Date(iso);
    const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    const year = String(d.getUTCFullYear());
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
    return `${weekday} ${day} ${month} ${year}, ${time}`;
}

function TaskList({ tasks, loadingTasks }: { tasks: Task[]; loadingTasks: boolean }) {
    const [usernames, setUsernames] = useState<Record<string, string>>({});

    useEffect(() => {
        async function loadUsernames() {
            const uniqueUserIds = [...new Set(tasks.map((task) => task.created_by))];
            const results = await Promise.all(
                uniqueUserIds.map(async (userId) => {
                    const user = await getUser(userId);
                    return { userId, username: user?.username ?? userId };
                })
            );
            setUsernames(Object.fromEntries(results.map(({ userId, username }) => [userId, username])));
        }
        if (tasks.length > 0) loadUsernames();
    }, [tasks]);

    return (
        <div className="flex min-h-25 flex-col gap-2">
            <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
                <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                    <h1 className="truncate text-base font-bold text-white">Task Name</h1>
                    <h1 className="truncate text-base font-bold text-white">Category</h1>
                    <h1 className="truncate text-base font-bold text-white">Created by</h1>
                    <h1 className="truncate text-base font-bold text-white">Duedate</h1>
                </div>
            </div>

            {loadingTasks ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">Loading tasks...</p>
            ) : tasks.length === 0 ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">Good job! You have completed all tasks.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex h-8 items-center gap-6 rounded-[20px] bg-white px-3">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${task.updated !== task.created ? "bg-(--primary-red)" : "bg-(--primary-blue)"}`} />
                            <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                                <p className="truncate text-sm text-black">{task.name}</p>
                                <p className="truncate text-sm text-black">{categoryMap[task.category_id]}</p>
                                <p className="truncate text-sm text-black">{usernames[task.created_by] ?? "-"}</p>
                                <p className="text-sm text-black">{formatDueDate(task.due_date)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TicketList({ tickets, loadingTickets }: { tickets: Ticket[]; loadingTickets: boolean }) {
    return (
        <div className="flex min-h-25 flex-1 flex-col gap-2">
            <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
                <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                    <h1 className="truncate text-base font-bold text-white">Ticket Name</h1>
                    <h1 className="truncate text-base font-bold text-white">Category</h1>
                    <h1 className="truncate text-base font-bold text-white">Status</h1>
                    <h1 className="truncate text-base font-bold text-white">Duedate</h1>
                </div>
            </div>

            {loadingTickets ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">Loading tickets...</p>
            ) : tickets.length === 0 ? (
                <p className="py-4 text-center text-base font-medium text-gray-500">"Looks like everything's pretty peaceful around here. Hell yeah!"</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tickets.map((ticket) => {
                        const isAccepted = ticket.status === "accepted";
                        const textCls = `truncate text-sm ${isAccepted ? "text-gray-400" : "text-black"}`;
                        return (
                            <div key={ticket.id} className={`flex h-8 items-center gap-4 rounded-[20px] px-2 ${isAccepted ? "bg-gray-100" : "bg-white"}`}>
                                <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={ticket.status} draggable={false} />
                                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                                    <p className={textCls}>{ticket.name}</p>
                                    <p className={textCls}>{categoryMap[ticket.category_id]}</p>
                                    <p className={textCls}>{ticketStatusText[ticket.status]}</p>
                                    <p className={`text-sm ${isAccepted ? "text-gray-400" : "text-black"}`}>{formatDueDate(ticket.due_date)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function TaskTicketList({ tasks, loadingTasks, tickets, loadingTickets }: { tasks: Task[]; loadingTasks: boolean; tickets: Ticket[]; loadingTickets: boolean }) {
    return (
        <div className="flex min-w-0 flex-1 shrink-0">
            <div className="flex h-full w-full flex-col gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
                <TaskList tasks={tasks} loadingTasks={loadingTasks} />
                <TicketList tickets={tickets} loadingTickets={loadingTickets} />
            </div>
        </div>
    );
}
