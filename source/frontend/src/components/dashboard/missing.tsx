import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import {
  formatCount,
  isMissingItem,
  type DashboardLimits,
} from "@/components/dashboard/dashboard_status";

export default function Missing({
  myTasks,
  myPendingTickets,
  myRejectedTickets,
  loadingMyTasks,
  loadingMyTickets,
  limits,
}: {
  myTasks: Task[];
  myPendingTickets: Ticket[];
  myRejectedTickets: Ticket[];
  loadingMyTasks: boolean;
  loadingMyTickets: boolean;
  limits: DashboardLimits;
}) {
  if (loadingMyTasks || loadingMyTickets) {
    return null;
  }

  const now = new Date();

  const extraTasks = myTasks.slice(limits.myTasks);
  const extraPendingTickets = myPendingTickets.slice(limits.myPendingTickets);

  const overdueTasks = myTasks
    .slice(0, limits.myTasks)
    .filter((task) => isMissingItem(task, ["in_progress"], now)).length;

  const overduePendingTickets = myPendingTickets
    .slice(0, limits.myPendingTickets)
    .filter((ticket) => isMissingItem(ticket, ["pending"], now)).length;

  const rejectedTickets = myRejectedTickets.length;

  const sections = [
    {
      label: "Overdue Tasks",
      count: overdueTasks,
      hasMore: extraTasks.some((task) =>
        isMissingItem(task, ["in_progress"], now),
      ),
    },
    {
      label: "Rejected Tickets",
      count: rejectedTickets,
      hasMore: rejectedTickets > limits.myRejectedTickets,
    },
    {
      label: "Overdue Pending Tickets",
      count: overduePendingTickets,
      hasMore: extraPendingTickets.some((ticket) =>
        isMissingItem(ticket, ["pending"], now),
      ),
    },
  ];

  const visibleSections = sections.filter(
    (section) => section.count > 0 || section.hasMore,
  );

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
            {section.label === "Rejected Tickets"
              ? formatCount(section.count, limits.myRejectedTickets)
              : `${section.count}${section.hasMore ? "+" : ""}`}
          </h1>
        </div>
      ))}
    </div>
  );
}
