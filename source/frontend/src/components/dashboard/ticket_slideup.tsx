"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import Icon from "@/components/icon";
import { buildRequestTableUrl } from "@/components/dashboard/redirect";
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
  currentUserId,
  onClose,
}: {
  ticket: Ticket;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { isClosing, handleClose } = useSlideupClose(onClose);
  const [redirecting, setRedirecting] = useState(false);
  const isMyRejectedTicket =
    ticket.status === "rejected" && ticket.created_by === currentUserId;
  const isMyPendingTicket =
    ticket.status === "pending" && ticket.created_by === currentUserId;

  return (
    <SlideupFrame
      isClosing={isClosing}
      onClose={handleClose}
      className="flex flex-col"
    >
      <div className="flex justify-end gap-4 pb-2">
        <button
          type="button"
          onClick={() => {
            setRedirecting(true);
            router.push(buildRequestTableUrl("ticket", ticket.id));
          }}
          disabled={redirecting}
          className={`flex h-7.5 w-60 items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${
            redirecting
              ? "cursor-wait bg-gray-700"
              : "cursor-pointer bg-black hover:bg-gray-700"
          }`}
        >
          {isMyRejectedTicket
            ? "Revise in Request-table"
            : isMyPendingTicket
              ? "Edit in Request-table"
              : "Open in Request-table"}
        </button>
        <SlideupCloseButton onClose={handleClose} />
      </div>

      <h1 className="min-w-0 wrap-break-word text-3xl font-bold text-black">
        {ticket.name}
      </h1>

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
