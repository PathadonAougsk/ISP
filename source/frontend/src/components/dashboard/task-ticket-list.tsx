"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
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
type PanelName = "task" | "ticket";

const DashboardListLayoutContext = createContext<{
  setCollapsed: (panel: PanelName, collapsed: boolean) => void;
} | null>(null);

type SortKey = "name" | "created_by" | "category" | "status" | "due_date";
type SortDirection = "asc" | "desc";
type SortState = { key: SortKey; direction: SortDirection };

function compareValues(
  first: string | null,
  second: string | null,
  direction: SortDirection,
  date = false,
) {
  if (date) {
    if (first === null && second === null) return 0;
    if (first === null) return 1;
    if (second === null) return -1;

    const result = Date.parse(first) - Date.parse(second);
    return direction === "asc" ? result : -result;
  }

  const result = (first ?? "").localeCompare(second ?? "", undefined, {
    sensitivity: "base",
  });
  return direction === "asc" ? result : -result;
}

function sortTasks(
  tasks: Task[],
  sort: SortState,
  categoryMap: CategoryMap,
  usernames: Record<string, string>,
) {
  return [...tasks].sort((first, second) => {
    if (sort.key === "due_date") {
      return compareValues(
        first.due_date,
        second.due_date,
        sort.direction,
        true,
      );
    }
    if (sort.key === "status") return 0;

    const values = {
      name: [first.name, second.name],
      created_by: [
        usernames[first.created_by] ?? "-",
        usernames[second.created_by] ?? "-",
      ],
      category: [
        categoryMap[first.category_id] ?? "-",
        categoryMap[second.category_id] ?? "-",
      ],
    } as const;
    const [firstValue, secondValue] = values[sort.key];
    return compareValues(firstValue, secondValue, sort.direction);
  });
}

function sortTickets(
  tickets: Ticket[],
  sort: SortState,
  categoryMap: CategoryMap,
) {
  return [...tickets].sort((first, second) => {
    if (sort.key === "due_date") {
      return compareValues(
        first.due_date,
        second.due_date,
        sort.direction,
        true,
      );
    }
    if (sort.key === "created_by") return 0;

    const values = {
      name: [first.name, second.name],
      status: [
        ticketStatusText[first.status],
        ticketStatusText[second.status],
      ],
      category: [
        categoryMap[first.category_id] ?? "-",
        categoryMap[second.category_id] ?? "-",
      ],
    } as const;
    const [firstValue, secondValue] = values[sort.key];
    return compareValues(firstValue, secondValue, sort.direction);
  });
}

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
      {onLoadMore && <LoadMoreButton disabled={false} onClick={onLoadMore} />}
      <div className="h-2 shrink-0" />
    </div>
  );
}

// column header + scrolling sections. shows a message when there is nothing
function ListPanel({
  panel,
  titles,
  hasOverflow,
  listRef,
  empty,
  message,
  children,
  sortKeys,
  sort,
  onSort,
}: {
  panel: PanelName;
  titles: string[];
  hasOverflow: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  empty: boolean;
  message: ReactNode;
  children: ReactNode;
  sortKeys: SortKey[];
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const layout = useContext(DashboardListLayoutContext);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <TableHeader
        titles={titles}
        gridClassName={GRID}
        hasOverflow={hasOverflow}
        onIconClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          layout?.setCollapsed(panel, next);
        }}
        iconLabel={collapsed ? "Show list section" : "Hide list section"}
        iconPressed={collapsed}
        sortKeys={sortKeys}
        sortKey={sort.key}
        sortDirection={sort.direction}
        onSort={onSort}
      />
      
      <div
        className={`grid min-h-0 flex-1 overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="flex min-h-0 flex-col overflow-hidden">
          {empty ? (
            <ListMessage>{message}</ListMessage>
          ) : (
            <div
              ref={listRef}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin"
            >
              {children}
            </div>
          )}
        </div>
      </div>
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
  const [sort, setSort] = useState<SortState>({
    key: "due_date",
    direction: "asc",
  });

  const { listRef, hasOverflow } = useListOverflow();

  function onSort(key: SortKey) {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  }

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
      panel="task"
      titles={["Task Name", "Created by", "Category", "Due Date"]}
      sortKeys={["name", "created_by", "category", "due_date"]}
      sort={sort}
      onSort={onSort}
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
          {sortTasks(myTasks.items, sort, categoryMap, usernames).map(
            renderTask,
          )}
        </ListSection>
      )}

      {hasOtherTasks && (
        <ListSection title="Others' tasks" {...sectionProps(otherTasks)}>
          {sortTasks(otherTasks.items, sort, categoryMap, usernames).map(
            renderTask,
          )}
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
    {
      title: "My rejected tickets",
      status: "rejected",
      group: myRejectedTickets,
    },
    { title: "My pending tickets", status: "pending", group: myPendingTickets },
    {
      title: "Others' rejected tickets",
      status: "rejected",
      group: otherRejectedTickets,
    },
    {
      title: "Others' pending tickets",
      status: "pending",
      group: otherPendingTickets,
    },
  ];

  const loadingMine = myRejectedTickets.loading || myPendingTickets.loading;
  const loadingOthers =
    otherRejectedTickets.loading || otherPendingTickets.loading;
  const errorMine = myRejectedTickets.error || myPendingTickets.error;
  const errorOthers = otherRejectedTickets.error || otherPendingTickets.error;
  const [sort, setSort] = useState<SortState>({
    key: "due_date",
    direction: "asc",
  });

  const { listRef, hasOverflow } = useListOverflow();

  function onSort(key: SortKey) {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  }

  const orderedSections =
    sort.key === "status"
      ? [...sections].sort((first, second) => {
          const firstRank = first.status === "pending" ? 0 : 1;
          const secondRank = second.status === "pending" ? 0 : 1;
          const result = firstRank - secondRank;
          return sort.direction === "asc" ? result : -result;
        })
      : sections;

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
            className="size-4 shrink-0"
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
      panel="ticket"
      titles={["Ticket Name", "Status", "Category", "Due Date"]}
      sortKeys={["name", "status", "category", "due_date"]}
      sort={sort}
      onSort={onSort}
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
      {orderedSections.map(
        ({ title, group }) =>
          group.items.length > 0 && (
            <ListSection key={title} title={title} {...sectionProps(group)}>
              {sortTickets(group.items, sort, categoryMap).map(renderTicket)}
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
  const [collapsed, setCollapsed] = useState({
    task: false,
    ticket: false,
  });
  const taskCollapsed = collapsed.task;
  const ticketCollapsed = collapsed.ticket;
  const gridTemplateRows =
    taskCollapsed && ticketCollapsed
      ? "auto auto"
      : taskCollapsed
        ? "auto minmax(0, 1fr)"
        : ticketCollapsed
          ? "minmax(0, 1fr) auto"
          : "minmax(0, 1fr) minmax(0, 1fr)";

  return (
    <div className="relative flex min-h-[80vh] min-w-0 flex-1 shrink-0 min-[1100px]:min-h-0">
      <div
        className="absolute inset-0 grid min-h-0 content-start gap-2 overflow-hidden rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3 transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows }}
      >
        <DashboardListLayoutContext.Provider
          value={{
            setCollapsed: (panel, isCollapsed) =>
              setCollapsed((previous) => ({
                ...previous,
                [panel]: isCollapsed,
              })),
          }}
        >
          {children}
        </DashboardListLayoutContext.Provider>
      </div>
    </div>
  );
}
