"use client";

import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import Icon from "@/components/icon";
import { isMissing } from "@/components/dashboard/due_bucket";
import {
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/ticket_status";
import {
  PopupCloseButton,
  PopupDescription,
  PopupEdited,
  PopupFrame,
  PopupMeta,
  usePopupClose,
} from "@/components/dashboard/popup";

export default function TicketPopup({
  ticket,
  categoryMap,
  usernames,
  onClose,
}: {
  ticket: Ticket;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  onClose: () => void;
}) {
  const { isClosing, handleClose } = usePopupClose(onClose);

  return (
    <PopupFrame
      isClosing={isClosing}
      onClose={handleClose}
      className="flex flex-col"
    >
      <div className="flex min-w-0 items-start gap-2">
        <h1 className="min-w-0 flex-1 wrap-break-word text-3xl font-bold text-black">
          {ticket.name}
        </h1>
        <PopupCloseButton onClose={handleClose} />
      </div>

      <PopupMeta
        id={ticket.id}
        categoryName={categoryMap[ticket.category_id] ?? "-"}
        dueDate={ticket.due_date}
      >
        <div className="flex items-center gap-2">
          {ticketStatusIcon[ticket.status] && (
            <Icon src={ticketStatusIcon[ticket.status]} />
          )}
          <span>{ticketStatusText[ticket.status] ?? ticket.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon src="/user.svg" />
          <span>{usernames[ticket.created_by] ?? "-"}</span>
        </div>

        {isMissing(ticket.due_date, new Date()) && (
          <div className="flex h-6 items-center rounded-[20px] bg-(--primary-red) px-3 text-sm font-bold text-white">
            Missing
          </div>
        )}
      </PopupMeta>

      <PopupEdited created={ticket.created} updated={ticket.updated} />

      <PopupDescription description={ticket.description} />
    </PopupFrame>
  );
}
