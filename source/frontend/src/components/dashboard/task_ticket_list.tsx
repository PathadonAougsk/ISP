"use client";

import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/icon";
import {
  dueBucketColor,
  getDueBucket,
  getDueBucketLimits,
  isMissingItem,
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/dashboard_status";
import {
  ListMessage,
  ListPanel,
  ListRow,
  ListSection,
  useListOverflow,
} from "@/components/dashboard/dashboard_utils";

// ready-to-show count string
export type ListCounts = {
  myTasks: string;
  otherTasks: string;
  myRejectedTickets: string;
  myPendingTickets: string;
  otherRejectedTickets: string;
  otherPendingTickets: string;
};

function TaskList({
  myTasks,
  otherTasks,
  loadingMyTasks,
  loadingOtherTasks,
  errorMyTasks,
  errorOtherTasks,
  categoryMap,
  usernames,
  isLabUser,
  counts,
  onSelectTask,
}: {
  myTasks: Task[];
  otherTasks: Task[];
  loadingMyTasks: boolean;
  loadingOtherTasks: boolean;
  errorMyTasks: boolean;
  errorOtherTasks: boolean;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  isLabUser: boolean;
  counts: ListCounts;
  onSelectTask: (task: Task) => void;
}) {
  const limits = getDueBucketLimits(new Date());

  const hasMyTasks = !loadingMyTasks && myTasks.length > 0;
  const hasOtherTasks = otherTasks.length > 0;

  const { listRef, hasOverflow } = useListOverflow([myTasks, otherTasks]);

  const renderTask = (task: Task) => (
    <ListRow
      key={task.id}
      overdue={isMissingItem(task, "in_progress", limits.now)}
      spacingClassName="pl-2.5 pr-3.5 gap-6"
      lead={
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dueBucketColor[getDueBucket(task.due_date, limits)]}`}
        />
      }
      cells={[
        task.name,
        usernames[task.created_by] ?? "-",
        categoryMap[task.category_id] ?? "-",
        formatShortDate(task.due_date),
      ]}
      onClick={() => onSelectTask(task)}
    />
  );

  return (
    <ListPanel
      titles={["Task Name", "Created by", "Category", "Duedate"]}
      hasOverflow={hasOverflow}
      listRef={listRef}
      empty={!hasMyTasks && !hasOtherTasks}
      message={
        errorMyTasks || errorOtherTasks
          ? "Failed to load tasks"
          : loadingMyTasks || loadingOtherTasks
            ? "Loading tasks..."
            : "Good job! You have completed all tasks."
      }
    >
      {hasMyTasks && (
        <ListSection title="My tasks" count={counts.myTasks}>
          {myTasks.map(renderTask)}
        </ListSection>
      )}

      {hasOtherTasks && (
        <ListSection title="Others' tasks" count={counts.otherTasks}>
          {otherTasks.map(renderTask)}
        </ListSection>
      )}

      {loadingOtherTasks && <ListMessage>Loading tasks...</ListMessage>}

      {errorMyTasks && (
        <ListMessage>
          {isLabUser ? "Failed to load tasks" : "Failed to load my tasks"}
        </ListMessage>
      )}

      {errorOtherTasks && (
        <ListMessage>{"Failed to load others' tasks"}</ListMessage>
      )}
    </ListPanel>
  );
}

function TicketList({
  myRejectedTickets,
  myPendingTickets,
  otherRejectedTickets,
  otherPendingTickets,
  loadingMyTickets,
  loadingOtherTickets,
  errorMyTickets,
  errorOtherTickets,
  categoryMap,
  isLabUser,
  counts,
  onSelectTicket,
}: {
  myRejectedTickets: Ticket[];
  myPendingTickets: Ticket[];
  otherRejectedTickets: Ticket[];
  otherPendingTickets: Ticket[];
  loadingMyTickets: boolean;
  loadingOtherTickets: boolean;
  errorMyTickets: boolean;
  errorOtherTickets: boolean;
  categoryMap: CategoryMap;
  isLabUser: boolean;
  counts: ListCounts;
  onSelectTicket: (ticket: Ticket) => void;
}) {
  const now = new Date();

  const hasMyRejected = !loadingMyTickets && myRejectedTickets.length > 0;
  const hasMyPending = !loadingMyTickets && myPendingTickets.length > 0;
  // others wait for my tickets, so the list never jump around
  const hasOtherRejected = !loadingMyTickets && otherRejectedTickets.length > 0;
  const hasOtherTickets = !loadingMyTickets && otherPendingTickets.length > 0;

  const { listRef, hasOverflow } = useListOverflow([
    myRejectedTickets,
    myPendingTickets,
    otherRejectedTickets,
    otherPendingTickets,
  ]);

  const renderTicket = (ticket: Ticket) => {
    const overdue = isMissingItem(ticket, "pending", now);

    return (
      <ListRow
        key={ticket.id}
        overdue={overdue}
        spacingClassName="pl-1.5 pr-3.5 gap-5"
        lead={
          <Icon
            src={overdue ? "/alert.svg" : ticketStatusIcon[ticket.status]}
            className="h-4 w-auto shrink-0"
            alt={ticket.status}
          />
        }
        cells={[
          ticket.name,
          ticketStatusText[ticket.status],
          categoryMap[ticket.category_id] ?? "-",
          formatShortDate(ticket.due_date),
        ]}
        onClick={() => onSelectTicket(ticket)}
      />
    );
  };

  return (
    <ListPanel
      titles={["Ticket Name", "Status", "Category", "Duedate"]}
      hasOverflow={hasOverflow}
      listRef={listRef}
      empty={
        !hasMyRejected && !hasMyPending && !hasOtherRejected && !hasOtherTickets
      }
      message={
        errorMyTickets || errorOtherTickets
          ? "Failed to load tickets"
          : loadingMyTickets || loadingOtherTickets
            ? "Loading tickets..."
            : "Looks like everything's pretty peaceful around here. Hell yeah!"
      }
    >
      {hasMyRejected && (
        <ListSection
          title="My rejected tickets"
          count={counts.myRejectedTickets}
        >
          {myRejectedTickets.map(renderTicket)}
        </ListSection>
      )}

      {hasMyPending && (
        <ListSection title="My pending tickets" count={counts.myPendingTickets}>
          {myPendingTickets.map(renderTicket)}
        </ListSection>
      )}

      {hasOtherRejected && (
        <ListSection
          title="Others' rejected tickets"
          count={counts.otherRejectedTickets}
        >
          {otherRejectedTickets.map(renderTicket)}
        </ListSection>
      )}

      {hasOtherTickets && (
        <ListSection
          title="Others' pending tickets"
          count={counts.otherPendingTickets}
        >
          {otherPendingTickets.map(renderTicket)}
        </ListSection>
      )}

      {loadingOtherTickets && <ListMessage>Loading tickets...</ListMessage>}

      {errorMyTickets && (
        <ListMessage>
          {isLabUser ? "Failed to load tickets" : "Failed to load my tickets"}
        </ListMessage>
      )}

      {errorOtherTickets && (
        <ListMessage>{"Failed to load others' tickets"}</ListMessage>
      )}
    </ListPanel>
  );
}

export default function TaskTicketList({
  myTasks,
  otherTasks,
  loadingMyTasks,
  loadingOtherTasks,
  errorMyTasks,
  errorOtherTasks,
  myRejectedTickets,
  myPendingTickets,
  otherRejectedTickets,
  otherPendingTickets,
  loadingMyTickets,
  loadingOtherTickets,
  errorMyTickets,
  errorOtherTickets,
  categoryMap,
  usernames,
  isLabUser,
  counts,
  onSelectTask,
  onSelectTicket,
}: {
  myTasks: Task[];
  otherTasks: Task[];
  loadingMyTasks: boolean;
  loadingOtherTasks: boolean;
  errorMyTasks: boolean;
  errorOtherTasks: boolean;
  myRejectedTickets: Ticket[];
  myPendingTickets: Ticket[];
  otherRejectedTickets: Ticket[];
  otherPendingTickets: Ticket[];
  loadingMyTickets: boolean;
  loadingOtherTickets: boolean;
  errorMyTickets: boolean;
  errorOtherTickets: boolean;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  isLabUser: boolean;
  counts: ListCounts;
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
          counts={counts}
          onSelectTask={onSelectTask}
        />
        <TicketList
          myRejectedTickets={myRejectedTickets}
          myPendingTickets={myPendingTickets}
          otherRejectedTickets={otherRejectedTickets}
          otherPendingTickets={otherPendingTickets}
          loadingMyTickets={loadingMyTickets}
          loadingOtherTickets={loadingOtherTickets}
          errorMyTickets={errorMyTickets}
          errorOtherTickets={errorOtherTickets}
          categoryMap={categoryMap}
          isLabUser={isLabUser}
          counts={counts}
          onSelectTicket={onSelectTicket}
        />
      </div>
    </div>
  );
}
