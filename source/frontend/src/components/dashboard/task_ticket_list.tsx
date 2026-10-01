"use client";

import Image from "next/image";
import type { CategoryMap } from "@/components/category";
import type { Account } from "@/lib/account";
import type { Task } from "@/components/task";
import type { Ticket } from "@/components/ticket";
import { formatDueDate } from "@/lib/format";

export const ticketStatusText: Record<string, string> = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };
export const ticketStatusIcon: Record<string, string> = { pending: "/pending.svg", accepted: "/accepted.svg", rejected: "/rejected.svg" };

function TaskList({
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
                <div className="flex max-h-98 flex-col gap-2 overflow-y-auto">
                    {tasks.map((task) => {
                        const isUnassigned =
                            currentAccount !== null &&
                            currentAccount.role !== "Lab user" &&
                            !task.assignees.some((assignee) => assignee.id === currentAccount.id);

                        return (
                            <div
                                key={task.id}
                                onClick={() => onSelectTask(task)}
                                className={`group flex h-8 shrink-0 cursor-pointer items-center gap-6 rounded-[20px] px-3 ${isUnassigned ? "bg-gray-100 hover:bg-gray-200" : "bg-white hover:bg-gray-100"
                                    }`}
                            >
                                <span className={`h-2 w-2 shrink-0 rounded-full ${task.updated !== task.created ? "bg-(--primary-red)" : "bg-(--primary-blue)"}`} />
                                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                                    <p className={`truncate text-sm ${isUnassigned ? "text-gray-700 group-hover:text-gray-900" : "text-black"}`}>{task.name}</p>
                                    <p className={`truncate text-sm ${isUnassigned ? "text-gray-700 group-hover:text-gray-900" : "text-black"}`}>{categoryMap[task.category_id] ?? "-"}</p>
                                    <p className={`truncate text-sm ${isUnassigned ? "text-gray-700 group-hover:text-gray-900" : "text-black"}`}>{usernames[task.created_by] ?? "-"}</p>
                                    <p className={`text-sm ${isUnassigned ? "text-gray-700 group-hover:text-gray-900" : "text-black"}`}>{formatDueDate(task.due_date)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function TicketList({ tickets, loadingTickets, categoryMap, onSelectTicket }: { tickets: Ticket[]; loadingTickets: boolean; categoryMap: CategoryMap; onSelectTicket: (ticket: Ticket) => void }) {
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
                <div className="flex max-h-98 flex-col gap-2 overflow-y-auto">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} onClick={() => onSelectTicket(ticket)} className="flex h-8 shrink-0 cursor-pointer items-center gap-4 rounded-[20px] bg-white px-2 hover:bg-gray-100">
                            <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={ticket.status} draggable={false} />
                            <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                                <p className="truncate text-sm text-black">{ticket.name}</p>
                                <p className="truncate text-sm text-black">{categoryMap[ticket.category_id] ?? "-"}</p>
                                <p className="truncate text-sm text-black">{ticketStatusText[ticket.status]}</p>
                                <p className="text-sm text-black">{formatDueDate(ticket.due_date)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TaskTicketList({
    tasks,
    loadingTasks,
    tickets,
    loadingTickets,
    categoryMap,
    usernames,
    currentAccount,
    onSelectTask,
    onSelectTicket,
}: {
    tasks: Task[];
    loadingTasks: boolean;
    tickets: Ticket[];
    loadingTickets: boolean;
    categoryMap: CategoryMap;
    usernames: Record<string, string>;
    currentAccount: Account | null;
    onSelectTask: (task: Task) => void;
    onSelectTicket: (ticket: Ticket) => void;
}) {
    return (
        <div className="flex min-w-0 flex-1 shrink-0">
            <div className="flex h-full w-full flex-col gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
                <TaskList tasks={tasks} loadingTasks={loadingTasks} categoryMap={categoryMap} usernames={usernames} currentAccount={currentAccount} onSelectTask={onSelectTask} />
                <TicketList tickets={tickets} loadingTickets={loadingTickets} categoryMap={categoryMap} onSelectTicket={onSelectTicket} />
            </div>
        </div>
    );
}
