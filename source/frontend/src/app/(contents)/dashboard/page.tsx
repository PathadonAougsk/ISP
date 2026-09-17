"use client";

import { useEffect, useState } from "react";
import { getTasks, type Task } from "@/components/task";
import { getTickets, type Ticket } from "@/components/ticket";
import Announcement from "./dash_announcement";
import ActiveTask from "./dash_active_task";
import TaskOverview from "./dash_task_overview";
import TaskTicketList from "./dash_task_ticket_list";

export const categoryMap: Record<number, string> = {
  1: "Report 1",
  2: "Report 2",
  3: "Report 3",
  4: "Report 4",
  5: "Report 5",
  6: "Report 6",
  7: "Report 7",
  8: "Report 8",
  9: "Report 9",
  10: "Report 10",
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // get task
  useEffect(() => {
    getTasks()
      .then(({ Tasks }) => setTasks(Tasks))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, []);

  // get ticket
  useEffect(() => {
    getTickets({ onlyOwned: true })
      .then(({ Tickets }) => setTickets(Tickets))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, []);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-100 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
        <ActiveTask tasks={tasks} />
        <TaskOverview tasks={tasks} />
      </div>

      <TaskTicketList
        tasks={tasks}
        loadingTasks={loadingTasks}
        tickets={tickets}
        loadingTickets={loadingTickets}
      />
    </main>
  );
}
