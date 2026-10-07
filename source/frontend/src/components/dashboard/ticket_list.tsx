"use client";

import { Fragment } from "react";
import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/icon";
import { isMissingTicket } from "@/components/dashboard/due_bucket";
import {
  ListHeader,
  ListMessage,
  listGridClass,
  useListOverflow,
} from "@/components/dashboard/list_parts";
import {
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/ticket_status";

export default function TicketList({
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
                Others' pending tickets
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
