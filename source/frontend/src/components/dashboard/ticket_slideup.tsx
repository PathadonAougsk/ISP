"use client";

import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import Icon from "@/components/icon";
import {
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/dashboard_status";
import {
  SlideupDescription,
  SlideupEdited,
  SlideupDuedate,
  SlideupMeta,
  SlideupMissingBadge,
} from "@/components/dashboard/dashboard_utils";
import {
  SlideupCloseButton,
  SlideupFrame,
  useSlideupClose,
} from "@/components/modal_slideup";

export default function TicketSlideup({
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
  const { isClosing, handleClose } = useSlideupClose(onClose);

  return (
    <SlideupFrame
      isClosing={isClosing}
      onClose={handleClose}
      className="flex flex-col"
    >
      <div className="flex min-w-0 items-start gap-2">
        <h1 className="min-w-0 flex-1 wrap-break-word text-3xl font-bold text-black">
          {ticket.name}
        </h1>
        <SlideupCloseButton onClose={handleClose} />
      </div>

      <SlideupMeta
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
      </SlideupMeta>

      <SlideupEdited created={ticket.created} updated={ticket.updated} />

      <div className="flex items-end gap-8">
        <SlideupDuedate dueDate={ticket.due_date} />

        <SlideupMissingBadge
          type="ticket"
          status={ticket.status}
          dueDate={ticket.due_date}
        />
      </div>

      <SlideupDescription description={ticket.description} />
    </SlideupFrame>
  );
}
