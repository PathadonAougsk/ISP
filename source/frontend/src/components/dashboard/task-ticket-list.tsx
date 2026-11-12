"use client";

import type { ReactNode, RefObject } from "react";
import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/ui/icon";
import {
  ListMessage,
  LoadMoreButton,
  TableHeader,
  TableRow,
  useListOverflow,
} from "@/components/ui/table";
import {
  dueBucketColor,
  getDueBucket,
  getDueBucketLimits,
  isMissingItem,
  ticketStatusIcon,
  ticketStatusText,
  type GroupState,
} from "@/components/dashboard/dashboard-data";

// full class string, tailwind need to see it
const GRID = "grid-cols-[2fr_1.25fr_1.25fr_minmax(120px,1fr)]";

// same props for every section
const sectionProps = (group: GroupState) => ({
  // "current / total"
  count: `${group.items.length} / ${group.all.length}`,
  onLoadMore:
    group.all.length > group.items.length ? group.loadMore : undefined,
});

// label + rows of one section
// label = title + count (count already formatted into string)
// label sticky, so it stay under column header while its section scroll
// Load More show only when onLoadMore is given (list has hidden items)
function ListSection({
  title,
  count,
  onLoadMore,
  children,
}: {
  title: string;
  count: string;
  onLoadMore?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="sticky top-0 z-10 flex shrink-0 items-end gap-2 bg-(--panel-bg) pl-1">
        <h1 className="text-base font-semibold text-black">{title}</h1>
        <span className="text-lg font-bold text-green-800">{count}</span>
      </div>
      {children}
      {onLoadMore && (
        <LoadMoreButton
          label="Show more"
          disabled={false}
          onClick={onLoadMore}
        />
      )}
      <div className="h-2 shrink-0" />
    </div>
  );
}

// column header + scrolling sections. shows a message when there is nothing
function ListPanel({
  titles,
  hasOverflow,
  listRef,
  empty,
  message,
  children,
}: {
  titles: string[];
  hasOverflow: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  empty: boolean;
  message: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <TableHeader
        titles={titles}
        gridClassName={GRID}
        hasOverflow={hasOverflow}
      />

      {empty ? (
        <ListMessage>{message}</ListMessage>
      ) : (
        <div
          ref={listRef}
          className="flex min-h-0 flex-col gap-2 overflow-y-auto scrollbar-thin"
        >
          {children}
        </div>
      )}
    </div>
  );
}

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

  const { listRef, hasOverflow } = useListOverflow([
    myTasks.items,
    otherTasks.items,
  ]);

  const renderTask = (task: Task) => (
    <TableRow
      key={task.id}
      gridClassName={GRID}
      fullLastCell
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
        myTasks.error || otherTasks.error
          ? "Failed to load tasks"
          : myTasks.loading || otherTasks.loading
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

      {otherTasks.loading && <ListMessage>Loading tasks...</ListMessage>}

      {myTasks.error && (
        <ListMessage>
          {isLabUser ? "Failed to load tasks" : "Failed to load my tasks"}
        </ListMessage>
      )}

      {otherTasks.error && (
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

  const sections = [
    { title: "My rejected tickets", group: myRejectedTickets },
    { title: "My pending tickets", group: myPendingTickets },
    { title: "Others' rejected tickets", group: otherRejectedTickets },
    { title: "Others' pending tickets", group: otherPendingTickets },
  ];

  const loadingMine = myRejectedTickets.loading || myPendingTickets.loading;
  const loadingOthers =
    otherRejectedTickets.loading || otherPendingTickets.loading;
  const errorMine = myRejectedTickets.error || myPendingTickets.error;
  const errorOthers = otherRejectedTickets.error || otherPendingTickets.error;

  const { listRef, hasOverflow } = useListOverflow(
    sections.map(({ group }) => group.items),
  );

  const renderTicket = (ticket: Ticket) => {
    const overdue = isMissingItem(ticket, ["pending", "rejected"], now);

    return (
      <TableRow
        key={ticket.id}
        gridClassName={GRID}
        fullLastCell
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
      empty={sections.every(({ group }) => group.items.length === 0)}
      message={
        errorMine || errorOthers
          ? "Failed to load tickets"
          : loadingMine || loadingOthers
            ? "Loading tickets..."
            : "Looks like everything's pretty peaceful around here. Yay!"
      }
    >
      {sections.map(
        ({ title, group }) =>
          group.items.length > 0 && (
            <ListSection key={title} title={title} {...sectionProps(group)}>
              {group.items.map(renderTicket)}
            </ListSection>
          ),
      )}

      {loadingOthers && <ListMessage>Loading tickets...</ListMessage>}

      {errorMine && (
        <ListMessage>
          {isLabUser ? "Failed to load tickets" : "Failed to load my tickets"}
        </ListMessage>
      )}

      {errorOthers && (
        <ListMessage>{"Failed to load others' tickets"}</ListMessage>
      )}
    </ListPanel>
  );
}

// layout only, the two lists are passed as children
export default function TaskTicketList({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[80vh] min-w-0 flex-1 shrink-0 min-[1000px]:min-h-0">
      <div className="absolute inset-0 grid grid-rows-[minmax(0,auto)_minmax(0,auto)] content-start gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
        {children}
      </div>
    </div>
  );
}
