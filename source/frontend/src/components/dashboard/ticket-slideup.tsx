
"use client";

import { useState } from "react";
import { outranks, type AccountRole } from "@/lib/account";
import type { CategoryMap } from "@/lib/category";
import { putTicket, type Ticket } from "@/lib/ticket";
import Icon from "@/components/icon";
import {
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/dashboard-data";
import {
  RequestTableButton,
  SlideupDescription,
  SlideupDueRow,
  SlideupEdited,
  SlideupError,
  SlideupMeta,
  renderWithLinks,
} from "@/components/dashboard/dashboard-utils";
import {
  SlideupCloseButton,
  SlideupFrame,
  useSlideupClose,
} from "@/components/modal-slideup";

export default function TicketSlideup({
  ticket,
  categoryMap,
  usernames,
  creatorRoles,
  currentUserId,
  currentRole,
  onClose,
  onUpdated,
}: {
  ticket: Ticket;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  creatorRoles: Record<string, AccountRole>;
  currentUserId: string | null;
  currentRole: AccountRole | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { isClosing, handleClose } = useSlideupClose(onClose);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMyRejectedTicket =
    ticket.status === "rejected" && ticket.created_by === currentUserId;
  const isMyPendingTicket =
    ticket.status === "pending" && ticket.created_by === currentUserId;

  // only higher role can judge pending ticket of lower role
  const creatorRole = creatorRoles[ticket.created_by];
  const canJudge =
    currentRole !== null &&
    creatorRole !== undefined &&
    ticket.status === "pending" &&
    ticket.created_by !== currentUserId &&
    outranks(currentRole, creatorRole);

  async function handleJudge(status: "accepted" | "rejected") {
    setError(null);
    setSubmitting(true);

    try {
      await putTicket(ticket.id, { status });

      onUpdated();
      handleClose();
    } catch {
      setError(`Failed to ${status === "accepted" ? "accept" : "reject"}`);
    } finally {
      setSubmitting(false);
    }
  }

  const judgeButtonClass = (color: string) =>
    `flex h-10 w-40 items-center justify-center rounded-full text-lg font-bold text-white ${
      submitting ? "cursor-not-allowed bg-gray-200" : `cursor-pointer ${color}`
    }`;

  return (
    <SlideupFrame
      isClosing={isClosing}
      onClose={handleClose}
      className="flex flex-col"
    >
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-black">Ticket</h1>
          <h1 className="text-xl font-semibold text-gray-500">#{ticket.id}</h1>
        </div>

        <div className="flex items-center gap-4">
          <RequestTableButton
            type="ticket"
            id={ticket.id}
            label={
              isMyRejectedTicket
                ? "Revise in Request-table"
                : isMyPendingTicket
                  ? "Edit in Request-table"
                  : "Open in Request-table"
            }
          />
          <SlideupCloseButton onClose={handleClose} />
        </div>
      </div>

      <h1 className="min-w-0 wrap-break-word text-xl font-bold text-black">
        {renderWithLinks(ticket.name)}
      </h1>

      <SlideupMeta
        categoryName={categoryMap[ticket.category_id] ?? "-"}
        createdDate={ticket.created}
      >
        <div className="flex items-center gap-2">
          <Icon src={ticketStatusIcon[ticket.status]} />
          <span>{ticketStatusText[ticket.status]}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon src="/user.svg" alt="" className="h-4 w-auto" />
          <span>{usernames[ticket.created_by] ?? "-"}</span>
        </div>
      </SlideupMeta>

      <SlideupEdited created={ticket.created} updated={ticket.updated} />

      <SlideupDueRow
        type="ticket"
        status={ticket.status}
        dueDate={ticket.due_date}
      />

      <SlideupDescription description={ticket.description} />

      {canJudge && (
        <div className="mt-2 flex h-10 justify-end gap-2">
          {error && <SlideupError message={error} />}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleJudge("rejected")}
            className={judgeButtonClass(
              "bg-(--primary-red) hover:bg-(--primary-red-hover)",
            )}
          >
            Rejected
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleJudge("accepted")}
            className={judgeButtonClass(
              "bg-(--primary-color-2) hover:bg-(--primary-color-2-hover)",
            )}
          >
            Accepted
          </button>
        </div>
      )}
    </SlideupFrame>
  );
}
