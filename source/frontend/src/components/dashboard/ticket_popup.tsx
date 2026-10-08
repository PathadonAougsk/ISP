"use client";

import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import Icon from "@/components/icon";
import {
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/dashboard_status";
import {
  PopupCloseButton,
  PopupDescription,
  PopupEdited,
  PopupDuedate,
  PopupFrame,
  PopupMeta,
  PopupMissingBadge,
  usePopupClose,
} from "@/components/dashboard/dashboard_utils";

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
      </PopupMeta>

      <PopupEdited created={ticket.created} updated={ticket.updated} />

      <div className="flex items-end gap-8">
        <PopupDuedate dueDate={ticket.due_date} />

        <PopupMissingBadge
          type="ticket"
          status={ticket.status}
          dueDate={ticket.due_date}
        />
      </div>

      <PopupDescription description={ticket.description} />
    </PopupFrame>
  );
}
