"use client";

import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import TaskList from "@/components/dashboard/task_list";
import TicketList from "@/components/dashboard/ticket_list";

export default function TaskTicketList({
  myTasks,
  otherTasks,
  loadingMyTasks,
  loadingOtherTasks,
  errorMyTasks,
  errorOtherTasks,
  tickets,
  loadingTickets,
  errorTickets,
  categoryMap,
  usernames,
  isLabUser,
  onSelectTask,
  onSelectTicket,
}: {
  myTasks: Task[];
  otherTasks: Task[];
  loadingMyTasks: boolean;
  loadingOtherTasks: boolean;
  errorMyTasks: boolean;
  errorOtherTasks: boolean;
  tickets: Ticket[];
  loadingTickets: boolean;
  errorTickets: boolean;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  isLabUser: boolean;
  onSelectTask: (task: Task) => void;
  onSelectTicket: (ticket: Ticket) => void;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 shrink-0">
      <div className="absolute inset-0 grid grid-rows-[minmax(0,auto)_minmax(0,auto)] content-start gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
        <TaskList
          myTasks={myTasks}
          otherTasks={otherTasks}
          loadingMyTasks={loadingMyTasks}
          loadingOtherTasks={loadingOtherTasks}
          errorMyTasks={errorMyTasks}
          errorOtherTasks={errorOtherTasks}
          categoryMap={categoryMap}
          usernames={usernames}
          isLabUser={isLabUser}
          onSelectTask={onSelectTask}
        />
        <TicketList
          tickets={tickets}
          loadingTickets={loadingTickets}
          errorTickets={errorTickets}
          categoryMap={categoryMap}
          onSelectTicket={onSelectTicket}
        />
      </div>
    </div>
  );
}
