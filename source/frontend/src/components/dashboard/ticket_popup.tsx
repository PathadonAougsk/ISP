"use client";

import Image from "next/image";
import type { CategoryMap } from "@/components/category";
import type { Ticket } from "@/components/ticket";
import { ticketStatusIcon, ticketStatusText } from "@/components/dashboard/ticket_status";
import { renderWithLinks } from "@/components/dashboard/_render_link";
import { PopupEdited, PopupFrame, PopupMeta, usePopupClose } from "@/components/dashboard/popup";

export default function TicketPopup({
    ticket,
    categoryMap,
    onClose,
}: {
    ticket: Ticket;
    categoryMap: CategoryMap;
    onClose: () => void;
}) {
    const { isClosing, handleClose } = usePopupClose(onClose);

    return (
        <PopupFrame isClosing={isClosing} onClose={handleClose} className="flex flex-col">
            <div className="flex min-w-0 items-start gap-2">
                <h1 className="min-w-0 flex-1 wrap-break-word text-3xl font-bold text-black">{ticket.name}</h1>
                <button
                    type="button"
                    onClick={handleClose}
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white hover:bg-gray-200"
                    aria-label="Close"
                >
                    <Image src="/close.svg" width={0} height={0} sizes="auto" className="h-auto w-5" alt="" draggable={false} />
                </button>
            </div>

            <PopupMeta categoryName={categoryMap[ticket.category_id] ?? "-"} dueDate={ticket.due_date}>
                <div className="flex items-center gap-2">
                    {ticketStatusIcon[ticket.status] && (
                        <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                    )}
                    <span>{ticketStatusText[ticket.status] ?? ticket.status}</span>
                </div>
            </PopupMeta>

            <PopupEdited created={ticket.created} updated={ticket.updated} />

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
                {ticket.description ? renderWithLinks(ticket.description) : <span className="text-gray-400">No description</span>}
            </div>
        </PopupFrame>
    );
}
