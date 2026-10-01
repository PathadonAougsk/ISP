"use client";

import Image from "next/image";
import { useState } from "react";
import type { CategoryMap } from "@/components/category";
import type { Ticket } from "@/components/ticket";
import { ticketStatusIcon, ticketStatusText } from "@/components/dashboard/task_ticket_list";
import { formatFullDateTime } from "@/lib/format";
import { renderWithLinks } from "@/components/dashboard/_render_link";

export default function TicketPopup({
    ticket,
    categoryMap,
    onClose,
}: {
    ticket: Ticket;
    categoryMap: CategoryMap;
    onClose: () => void;
}) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const isEdited = ticket.updated !== ticket.created;

    return (
        <div className="fixed inset-0 z-50">
            <div className={`popup-overlay absolute inset-0 bg-black/60 ${isClosing ? "popup-overlay-closing" : ""}`} onClick={handleClose} />

            <div className={`popup-panel absolute bottom-0 left-[10%] flex h-[90%] w-[80%] flex-col rounded-t-[30px] bg-white p-5 ${isClosing ? "popup-panel-closing" : ""}`}>
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

                <div className="mt-2 flex flex-wrap items-center gap-x-12 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <Image src="/header_donut_gray.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                        <span>{categoryMap[ticket.category_id] ?? "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Image src="/clock.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                        <span>{formatFullDateTime(ticket.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {ticketStatusIcon[ticket.status] && (
                            <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                        )}
                        <span>{ticketStatusText[ticket.status] ?? ticket.status}</span>
                    </div>
                </div>

                {isEdited && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold italic">Edited</span>
                        <Image src="/clock.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                        <span>{formatFullDateTime(ticket.updated)}</span>
                    </div>
                )}

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
                    {ticket.description ? renderWithLinks(ticket.description) : <span className="text-gray-400">No description</span>}
                </div>
            </div>
        </div>
    );
}
