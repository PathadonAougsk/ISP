"use client";

import Image from "next/image";
import type { Account } from "@/lib/account";
import type { CategoryMap } from "@/components/category";
import type { Ticket } from "@/components/ticket";
import { formatDueDate } from "@/lib/format";
import { ticketStatusIcon, ticketStatusText } from "@/components/dashboard/ticket_status";

export default function TicketList({
    tickets,
    loadingTickets,
    categoryMap,
    currentAccount,
    onSelectTicket
}: {
    tickets: Ticket[];
    loadingTickets: boolean;
    categoryMap: CategoryMap;
    currentAccount: Account | null;
    onSelectTicket: (ticket: Ticket) => void
}) {
    return (
        <div className="flex min-h-0 flex-col gap-2">
            <div className="flex h-8 shrink-0 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
                <Image src="/header_donut_dark_green.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
                    <h1 className="truncate text-base font-bold text-white">Ticket Name</h1>
                    <h1 className="truncate text-base font-bold text-white">Status</h1>
                    <h1 className="truncate text-base font-bold text-white">Category</h1>
                    <h1 className="truncate text-base font-bold text-white">Duedate</h1>
                </div>
            </div>

            {loadingTickets ? (
                <p className="py-12 text-center text-base font-medium text-gray-500">Loading tickets...</p>
            ) : tickets.length === 0 ? (
                <p className="py-12 text-center text-base font-medium text-gray-500">"Looks like everything's pretty peaceful around here. Hell yeah!"</p>
            ) : (
                <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} onClick={() => onSelectTicket(ticket)} className="flex h-8 shrink-0 cursor-pointer items-center gap-4 rounded-[20px] bg-white px-2 hover:bg-gray-100">
                            <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={ticket.status} draggable={false} />
                            <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
                                <p className="truncate text-sm text-black">{ticket.name}</p>
                                <p className="truncate text-sm text-black">{ticketStatusText[ticket.status]}</p>
                                <p className="truncate text-sm text-black">{categoryMap[ticket.category_id] ?? "-"}</p>
                                <p className="text-sm text-black">{formatDueDate(ticket.due_date)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
