import {
  isMissingItem,
  withMore,
  type GroupState,
} from "@/components/dashboard/dashboard-data";

export default function Missing({
  myTasks,
  myPendingTickets,
  myRejectedTickets,
}: {
  myTasks: GroupState;
  myPendingTickets: GroupState;
  myRejectedTickets: GroupState;
}) {
  // hide while loading, or when load fail and nothing to show
  const loadingMyTasks =
    myTasks.loading || (myTasks.error && myTasks.all.length === 0);

  const loadingMyTickets =
    myPendingTickets.loading ||
    myRejectedTickets.loading ||
    ((myPendingTickets.error || myRejectedTickets.error) &&
      myPendingTickets.all.length === 0 &&
      myRejectedTickets.all.length === 0);

  if (loadingMyTasks || loadingMyTickets) {
    return null;
  }

  const now = new Date();

  const overdueTasks = myTasks.items.filter((task) =>
    isMissingItem(task, ["in_progress"], now),
  ).length;

  const overduePendingTickets = myPendingTickets.items.filter((ticket) =>
    isMissingItem(ticket, ["pending"], now),
  ).length;

  // the extra item can be overdue too
  const moreTasks =
    myTasks.overflow !== null &&
    isMissingItem(myTasks.overflow, ["in_progress"], now);

  const morePendingTickets =
    myPendingTickets.overflow !== null &&
    isMissingItem(myPendingTickets.overflow, ["pending"], now);

  const sections = [
    {
      label: "Overdue Tasks",
      value: withMore(overdueTasks, moreTasks),
      visible: overdueTasks > 0 || moreTasks,
    },
    {
      label: "Rejected Tickets",
      value: myRejectedTickets.count,
      visible: myRejectedTickets.all.length > 0,
    },
    {
      label: "Overdue Pending Tickets",
      value: withMore(overduePendingTickets, morePendingTickets),
      visible: overduePendingTickets > 0 || morePendingTickets,
    },
  ];

  const visibleSections = sections.filter((section) => section.visible);

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
            {section.value}
          </h1>
        </div>
      ))}
    </div>
  );
}
