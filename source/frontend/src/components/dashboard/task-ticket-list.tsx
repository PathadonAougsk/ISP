"use client";

import type { ReactNode } from "react";
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
  type GroupState,
} from "@/components/dashboard/dashboard-data";
import {
  ListMessage,
  ListPanel,
  ListRow,
  ListSection,
  useListOverflow,
} from "@/components/dashboard/dashboard-utils";

// same props for every section
const sectionProps = (group: GroupState) => ({
  count: group.count,
  busy: group.refreshing,
  onLoadMore: group.overflow ? group.loadMore : undefined,
});

export function TaskList({
  myTasks,
  otherTasks,
  categoryMap,
  usernames,
  isLabUser,
  onSelectTask,
}: {
  myTasks: GroupState<Task>;
  otherTasks: GroupState<Task>;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  isLabUser: boolean;
  onSelectTask: (task: Task) => void;
}) {
  const limits = getDueBucketLimits(new Date());

  const hasMyTasks = myTasks.items.length > 0;
  const hasOtherTasks = otherTasks.items.length > 0;

  const loadingMyTasks = myTasks.loading;
  const loadingOtherTasks = otherTasks.loading;
  const errorMyTasks = myTasks.error;
  const errorOtherTasks = otherTasks.error;

  const { listRef, hasOverflow } = useListOverflow([
    myTasks.items,
    otherTasks.items,
  ]);

  const renderTask = (task: Task) => (
    <ListRow
      key={task.id}
      overdue={isMissingItem(task, ["in_progress"], limits.now)}
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
        <ListSection title="My tasks" {...sectionProps(myTasks)}>
          {myTasks.items.map(renderTask)}
        </ListSection>
      )}

      {hasOtherTasks && (
        <ListSection title="Others' tasks" {...sectionProps(otherTasks)}>
          {otherTasks.items.map(renderTask)}
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

export function TicketList({
  myRejectedTickets,
  myPendingTickets,
  otherRejectedTickets,
  otherPendingTickets,
  categoryMap,
  isLabUser,
  onSelectTicket,
}: {
  myRejectedTickets: GroupState<Ticket>;
  myPendingTickets: GroupState<Ticket>;
  otherRejectedTickets: GroupState<Ticket>;
  otherPendingTickets: GroupState<Ticket>;
  categoryMap: CategoryMap;
  isLabUser: boolean;
  onSelectTicket: (ticket: Ticket) => void;
}) {
  const now = new Date();

  const hasMyRejected = myRejectedTickets.items.length > 0;
  const hasMyPending = myPendingTickets.items.length > 0;
  const hasOtherRejected = otherRejectedTickets.items.length > 0;
  const hasOtherTickets = otherPendingTickets.items.length > 0;

  const loadingMyTickets =
    myRejectedTickets.loading || myPendingTickets.loading;
  const loadingOtherTickets =
    otherRejectedTickets.loading || otherPendingTickets.loading;
  const errorMyTickets = myRejectedTickets.error || myPendingTickets.error;
  const errorOtherTickets =
    otherRejectedTickets.error || otherPendingTickets.error;

  const { listRef, hasOverflow } = useListOverflow([
    myRejectedTickets.items,
    myPendingTickets.items,
    otherRejectedTickets.items,
    otherPendingTickets.items,
  ]);

  const renderTicket = (ticket: Ticket) => {
    const overdue = isMissingItem(ticket, ["pending", "rejected"], now);

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
            : "Looks like everything's pretty peaceful around here. Yay!"
      }
    >
      {hasMyRejected && (
        <ListSection
          title="My rejected tickets"
          {...sectionProps(myRejectedTickets)}
        >
          {myRejectedTickets.items.map(renderTicket)}
        </ListSection>
      )}

      {hasMyPending && (
        <ListSection
          title="My pending tickets"
          {...sectionProps(myPendingTickets)}
        >
          {myPendingTickets.items.map(renderTicket)}
        </ListSection>
      )}

      {hasOtherRejected && (
        <ListSection
          title="Others' rejected tickets"
          {...sectionProps(otherRejectedTickets)}
        >
          {otherRejectedTickets.items.map(renderTicket)}
        </ListSection>
      )}

      {hasOtherTickets && (
        <ListSection
          title="Others' pending tickets"
          {...sectionProps(otherPendingTickets)}
        >
          {otherPendingTickets.items.map(renderTicket)}
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

// layout only, the two lists are passed as children
export default function TaskTicketList({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[80vh] min-w-0 flex-1 shrink-0">
      <div className="absolute inset-0 grid grid-rows-[minmax(0,auto)_minmax(0,auto)] content-start gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
        {children}
      </div>
    </div>
  );
}
