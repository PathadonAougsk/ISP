"use client";

import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import { isMissingItem } from "@/components/dashboard/dashboard_status";
import { formatCount } from "@/components/dashboard/dashboard_utils";

export default function Missing({
  myTasks,
  myPendingTickets,
  myRejectedTickets,
  loadingMyTasks,
  loadingMyPendingTickets,
  loadingMyRejectedTickets,
  maxTask,
  maxTicket,
}: {
  myTasks: Task[];
  myPendingTickets: Ticket[];
  myRejectedTickets: Ticket[];
  loadingMyTasks: boolean;
  loadingMyPendingTickets: boolean;
  loadingMyRejectedTickets: boolean;
  maxTask: number;
  maxTicket: number;
}) {
  const now = new Date();

  const overdueTasks = myTasks.filter((task) =>
    isMissingItem(task, "in_progress", now),
  ).length;

  const pastDueTickets = myPendingTickets.filter((ticket) =>
    isMissingItem(ticket, "pending", now),
  ).length;

  const rejectedTickets = myRejectedTickets.length;

  const sections = [
    {
      label: "Overdue Tasks",
      count: overdueTasks,
      max: maxTask,
      loading: loadingMyTasks,
    },
    {
      label: "Past Due Tickets",
      count: pastDueTickets,
      max: maxTicket,
      loading: loadingMyPendingTickets,
    },
    {
      label: "Rejected Tickets",
      count: rejectedTickets,
      max: maxTicket,
      loading: loadingMyRejectedTickets,
    },
  ];

  const visibleSections = sections.filter(
    (section) => section.loading || section.count > 0,
  );

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full divide-x divide-white rounded-[30px] bg-(--primary-red)">
      {visibleSections.map((section) => (
        <div
          key={section.label}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-3"
        >
          <h1 className="text-center text-lg font-bold text-white">
            {section.label}
          </h1>
          <h1 className="text-5xl font-extrabold text-white">
            {section.loading ? "-" : formatCount(section.count, section.max)}
          </h1>
        </div>
      ))}
    </div>
  );
}
