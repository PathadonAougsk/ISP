"use client";

import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import { isMissing, isMissingTicket } from "@/components/dashboard/due_bucket";

export default function Missing({
  myTasks,
  otherTasks,
  tickets,
  loadingMyTasks,
  loadingOtherTasks,
  loadingTickets,
  isLabUser,
}: {
  myTasks: Task[];
  otherTasks: Task[];
  tickets: Ticket[];
  loadingMyTasks: boolean;
  loadingOtherTasks: boolean;
  loadingTickets: boolean;
  isLabUser: boolean;
}) {
  const now = new Date();

  const countTasks = (tasks: Task[]) =>
    tasks.filter((task) => isMissing(task.due_date, now)).length;

  const myTaskIds = new Set(myTasks.map((task) => task.id));
  // remove dupe tasks
  const othersOnly = otherTasks.filter((task) => !myTaskIds.has(task.id));

  const missingTickets = tickets.filter((ticket) =>
    isMissingTicket(ticket, now),
  ).length;

  const sections = [
    {
      label: "My Missing Tasks",
      count: countTasks(myTasks),
      loading: loadingMyTasks,
    },
    // lab user cant see other tasks
    ...(isLabUser
      ? []
      : [
          {
            label: "Other Missing Tasks",
            count: countTasks(othersOnly),
            loading: loadingOtherTasks || loadingMyTasks,
          },
        ]),
    {
      label: "Missing Tickets",
      count: missingTickets,
      loading: loadingTickets,
    },
  ];

  // if nothing is missing, hide whole squircle
  if (sections.every((section) => section.loading || section.count === 0))
    return null;

  return (
    <div className="flex w-full divide-x divide-white rounded-[30px] bg-(--primary-red)">
      {sections.map((section) => (
        <div
          key={section.label}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-3"
        >
          <h1 className="text-center text-base font-bold text-white">
            {section.label}
          </h1>
          <h1 className="text-5xl font-extrabold text-white">
            {section.loading ? "-" : section.count}
          </h1>
        </div>
      ))}
    </div>
  );
}
