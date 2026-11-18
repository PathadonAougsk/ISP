"use client";

import { useState } from "react";
import type { AccountRole, Member } from "@/lib/account";
import type { CategoryMap } from "@/lib/category";
import { canJudgeTicket, judgeTicket, type Ticket } from "@/lib/ticket";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import { CloseButton, Slideup } from "@/components/ui/slideup";
import MemberPanel from "@/components/request-table/MemberPanel";
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
} from "@/components/dashboard/dashboard-utils";

export default function TicketSlideup({
  ticket,
  categoryMap,
  usernames,
  creatorRoles,
  members,
  currentUserId,
  currentRole,
  onClose,
}: {
  ticket: Ticket;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  creatorRoles: Record<string, AccountRole>;
  members: Member[];
  currentUserId: string | null;
  currentRole: AccountRole | null;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  const isMine = ticket.created_by === currentUserId;

  const canJudge = canJudgeTicket(
    currentRole,
    creatorRoles[ticket.created_by],
    isMine,
    ticket.status === "pending",
  );

  async function handleJudge(
    status: "accepted" | "rejected",
    close: () => void,
  ) {
    setError(null);
    setSubmitting(true);

    try {
      await judgeTicket(ticket.id, status, assignedIds);

      close();
    } catch {
      setError(`Failed to ${status === "accepted" ? "accept" : "reject"}`);
    } finally {
      setSubmitting(false);
    }
  }

  const linkLabel =
    isMine && ticket.status === "rejected"
      ? "Revise in Request-table"
      : isMine && ticket.status === "pending"
        ? "Edit in Request-table"
        : "Open in Request-table";

  return (
    <Slideup onClose={onClose}>
      {(close) => (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-2">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold text-black">Ticket</h1>
              <h1 className="text-xl font-semibold text-gray-500">
                #{ticket.id}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <RequestTableButton
                type="ticket"
                id={ticket.id}
                label={linkLabel}
              />
              <CloseButton onClose={close} />
            </div>
          </div>

          {/* Main content */}
          <div className="flex min-h-0 flex-1 gap-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="min-w-0 wrap-break-word text-xl font-bold text-black">
                {renderWithLinks(ticket.name)}
              </h1>

              <SlideupMeta
                categoryName={categoryMap[ticket.category_id] ?? "-"}
                createdDate={ticket.created}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    src={ticketStatusIcon[ticket.status]}
                    className="size-4"
                  />
                  <span>{ticketStatusText[ticket.status]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon src="/account.svg" alt="" className="size-4" />
                  <span>{usernames[ticket.created_by] ?? "-"}</span>
                </div>
              </SlideupMeta>

              <SlideupEdited
                created={ticket.created}
                updated={ticket.updated}
              />

              <SlideupDueRow
                type="ticket"
                status={ticket.status}
                dueDate={ticket.due_date}
              />

              <SlideupDescription description={ticket.description} />
            </div>

            {canJudge && (
              <MemberPanel
                members={members}
                selectedIds={assignedIds}
                onChange={setAssignedIds}
                hint="Selected members are assigned to the task when you accept."
              />
            )}
          </div>

          {/* Footer */}
          {canJudge && (
            <div className="mt-3 flex h-10 shrink-0 justify-end gap-2">
              {error && <SlideupError message={error} />}

              {(["rejected", "accepted"] as const).map((status) => (
                <Button
                  key={status}
                  variant={
                    submitting
                      ? "busy"
                      : status === "rejected"
                        ? "red"
                        : "green"
                  }
                  disabled={submitting}
                  onClick={() => handleJudge(status, close)}
                  className="h-10 w-40 text-lg font-bold"
                >
                  {ticketStatusText[status]}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </Slideup>
  );
}
