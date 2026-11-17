import {
  isMissingItem,
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

  const overdueTasks = myTasks.all.filter((task) =>
    isMissingItem(task, ["in_progress"], now),
  ).length;

  const overduePendingTickets = myPendingTickets.all.filter((ticket) =>
    isMissingItem(ticket, ["pending"], now),
  ).length;

  const sections = [
    {
      label: "Overdue Tasks",
      value: overdueTasks,
      visible: overdueTasks > 0,
    },
    {
      label: "Rejected Tickets",
      value: myRejectedTickets.all.length,
      visible: myRejectedTickets.all.length > 0,
    },
    {
      label: "Overdue Pending Tickets",
      value: overduePendingTickets,
      visible: overduePendingTickets > 0,
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
