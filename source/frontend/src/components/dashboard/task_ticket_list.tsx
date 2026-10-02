"use client";

import type { CategoryMap } from "@/components/category";
import type { Account } from "@/lib/account";
import type { Task } from "@/components/task";
import type { Ticket } from "@/components/ticket";
import TaskList from "@/components/dashboard/task_list";
import TicketList from "@/components/dashboard/ticket_list";

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
        <div className="relative flex min-w-0 flex-1 shrink-0">
            <div className="absolute inset-0 flex flex-col gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
                <TaskList tasks={tasks} loadingTasks={loadingTasks} categoryMap={categoryMap} usernames={usernames} currentAccount={currentAccount} onSelectTask={onSelectTask} />
                <TicketList tickets={tickets} loadingTickets={loadingTickets} categoryMap={categoryMap} onSelectTicket={onSelectTicket} />
            </div>
        </div>
    );
}
