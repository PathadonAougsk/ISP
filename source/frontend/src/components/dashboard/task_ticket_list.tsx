"use client";

import { Fragment } from "react";
import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/icon";
import {
  dueBucketColor,
  getDueBucket,
  getDueBucketLimits,
  isMissingTask,
  isMissingTicket,
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/dashboard_status";
import {
  ListHeader,
  ListMessage,
  listGridClass,
  useListOverflow,
} from "@/components/dashboard/dashboard_utils";

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
  onSelectTask: (task: Task) => void;
}) {
  const limits = getDueBucketLimits(new Date());

  const hasMyTasks = !loadingMyTasks && myTasks.length > 0;
  const hasOtherTasks = otherTasks.length > 0;

  const { listRef, hasOverflow } = useListOverflow([myTasks, otherTasks]);

  const renderTask = (task: Task) => {
    const overdue = isMissingTask(task, limits.now);

    return (
      <button
        key={task.id}
        type="button"
        onClick={() => onSelectTask(task)}
        className={`flex h-8 pl-2.5 pr-3.5 w-full shrink-0 cursor-pointer items-center gap-6 rounded-[20px] border-2 bg-white text-left hover:bg-gray-100 ${
          overdue
            ? "border-(--primary-red) text-red-700"
            : "border-transparent text-black"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dueBucketColor[getDueBucket(task.due_date, limits)]}`}
        />
        <div className={listGridClass}>
          <p className="truncate text-sm">{task.name}</p>
          <p className="truncate text-sm">
            {usernames[task.created_by] ?? "-"}
          </p>
          <p className="truncate text-sm">
            {categoryMap[task.category_id] ?? "-"}
          </p>
          <p className="text-sm">{formatShortDate(task.due_date)}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ListHeader
        titles={["Task Name", "Created by", "Category", "Duedate"]}
        hasOverflow={hasOverflow}
      />

      {!hasMyTasks && !hasOtherTasks ? (
        <ListMessage>
          {errorMyTasks || errorOtherTasks
            ? "Failed to load tasks"
            : loadingMyTasks || loadingOtherTasks
              ? "Loading tasks..."
              : "Good job! You have completed all tasks."}
        </ListMessage>
      ) : (
        <div
          ref={listRef}
          className="flex min-h-0 flex-col gap-2 overflow-y-auto scrollbar-thin"
        >
          {hasMyTasks && (
            <Fragment>
              {!isLabUser && (
                <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                  My tasks
                </h1>
              )}
              {myTasks.map(renderTask)}
            </Fragment>
          )}

          {hasOtherTasks && (
            <Fragment>
              <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                {"Others' tasks"}
              </h1>
              {otherTasks.map(renderTask)}
            </Fragment>
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
        </div>
      )}
    </div>
  );
}

function TicketList({
  myRejectedTickets,
  myPendingTickets,
  otherPendingTickets,
  loadingMyTickets,
  loadingOtherTickets,
  errorMyTickets,
  errorOtherTickets,
  categoryMap,
  isLabUser,
  onSelectTicket,
}: {
  myRejectedTickets: Ticket[];
  myPendingTickets: Ticket[];
  otherPendingTickets: Ticket[];
  loadingMyTickets: boolean;
  loadingOtherTickets: boolean;
  errorMyTickets: boolean;
  errorOtherTickets: boolean;
  categoryMap: CategoryMap;
  isLabUser: boolean;
  onSelectTicket: (ticket: Ticket) => void;
}) {
  const now = new Date();

  const hasMyRejected = !loadingMyTickets && myRejectedTickets.length > 0;
  const hasMyPending = !loadingMyTickets && myPendingTickets.length > 0;
  // others wait for my tickets, so the list never jump around
  const hasOtherTickets = !loadingMyTickets && otherPendingTickets.length > 0;

  const { listRef, hasOverflow } = useListOverflow([
    myRejectedTickets,
    myPendingTickets,
    otherPendingTickets,
  ]);

  const renderTicket = (ticket: Ticket) => {
    const overdue = isMissingTicket(ticket, now);

    return (
      <button
        key={ticket.id}
        type="button"
        onClick={() => onSelectTicket(ticket)}
        className={`flex h-8 pl-1.5 pr-3.5 w-full shrink-0 cursor-pointer items-center gap-5 rounded-[20px] border-2 bg-white text-left hover:bg-gray-100 ${
          overdue
            ? "border-(--primary-red) text-red-700"
            : "border-transparent text-black"
        }`}
      >
        <Icon
          src={overdue ? "/alert.svg" : ticketStatusIcon[ticket.status]}
          className="h-4 w-auto shrink-0"
          alt={ticket.status}
        />
        <div className={listGridClass}>
          <p className="truncate text-sm">{ticket.name}</p>
          <p className="truncate text-sm">{ticketStatusText[ticket.status]}</p>
          <p className="truncate text-sm">
            {categoryMap[ticket.category_id] ?? "-"}
          </p>
          <p className="text-sm">{formatShortDate(ticket.due_date)}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ListHeader
        titles={["Ticket Name", "Status", "Category", "Duedate"]}
        hasOverflow={hasOverflow}
      />

      {!hasMyRejected && !hasMyPending && !hasOtherTickets ? (
        <ListMessage>
          {errorMyTickets || errorOtherTickets
            ? "Failed to load tickets"
            : loadingMyTickets || loadingOtherTickets
              ? "Loading tickets..."
              : "Looks like everything's pretty peaceful around here. Hell yeah!"}
        </ListMessage>
      ) : (
        <div
          ref={listRef}
          className="flex min-h-0 flex-col gap-2 overflow-y-auto scrollbar-thin"
        >
          {hasMyRejected && (
            <Fragment>
              <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                My rejected tickets
              </h1>
              {myRejectedTickets.map(renderTicket)}
            </Fragment>
          )}

          {hasMyPending && (
            <Fragment>
              <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                My pending tickets
              </h1>
              {myPendingTickets.map(renderTicket)}
            </Fragment>
          )}

          {hasOtherTickets && (
            <Fragment>
              <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                {"Others' pending tickets"}
              </h1>
              {otherPendingTickets.map(renderTicket)}
            </Fragment>
          )}

          {loadingOtherTickets && <ListMessage>Loading tickets...</ListMessage>}

          {errorMyTickets && (
            <ListMessage>
              {isLabUser
                ? "Failed to load tickets"
                : "Failed to load my tickets"}
            </ListMessage>
          )}

          {errorOtherTickets && (
            <ListMessage>{"Failed to load others' tickets"}</ListMessage>
          )}
        </div>
      )}
    </div>
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
  otherPendingTickets,
  loadingMyTickets,
  loadingOtherTickets,
  errorMyTickets,
  errorOtherTickets,
  categoryMap,
  usernames,
  isLabUser,
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
  otherPendingTickets: Ticket[];
  loadingMyTickets: boolean;
  loadingOtherTickets: boolean;
  errorMyTickets: boolean;
  errorOtherTickets: boolean;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  isLabUser: boolean;
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
          onSelectTask={onSelectTask}
        />
        <TicketList
          myRejectedTickets={myRejectedTickets}
          myPendingTickets={myPendingTickets}
          otherPendingTickets={otherPendingTickets}
          loadingMyTickets={loadingMyTickets}
          loadingOtherTickets={loadingOtherTickets}
          errorMyTickets={errorMyTickets}
          errorOtherTickets={errorOtherTickets}
          categoryMap={categoryMap}
          isLabUser={isLabUser}
          onSelectTicket={onSelectTicket}
        />
      </div>
    </div>
  );
}
