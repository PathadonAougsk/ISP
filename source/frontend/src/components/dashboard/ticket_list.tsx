"use client";

import { Fragment } from "react";
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
    const displayedTickets = currentAccount !== null && currentAccount.role !== "Lab User"
        ? [...tickets].sort((a, b) => {
            const aMine = a.created_by === currentAccount.id;
            const bMine = b.created_by === currentAccount.id;

            if (aMine !== bMine) return aMine ? -1 : 1;
            if (a.due_date === null && b.due_date === null) return 0;
            if (a.due_date === null) return 1;
            if (b.due_date === null) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        })
        : tickets;

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
                    {displayedTickets.map((ticket, index) => {
                        const isMine = currentAccount !== null && ticket.created_by === currentAccount.id;
                        const showMyHeader = currentAccount !== null && currentAccount.role !== "Lab User" && index === 0 && isMine;
                        const showOtherHeader = currentAccount !== null && currentAccount.role !== "Lab User" && index > 0 && !isMine && displayedTickets[index - 1].created_by === currentAccount.id;

                        return (
                            <Fragment key={ticket.id}>
                                {showMyHeader && (
                                    <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">My tickets</h1>
                                )}
                                {showOtherHeader && (
                                    <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">Other tickets</h1>
                                )}
                                <div onClick={() => onSelectTicket(ticket)} className="flex h-8 shrink-0 cursor-pointer items-center gap-4 rounded-[20px] bg-white px-2 hover:bg-gray-100">
                                    <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={ticket.status} draggable={false} />
                                    <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
                                        <p className="truncate text-sm text-black">{ticket.name}</p>
                                        <p className="truncate text-sm text-black">{ticketStatusText[ticket.status]}</p>
                                        <p className="truncate text-sm text-black">{categoryMap[ticket.category_id] ?? "-"}</p>
                                        <p className="text-sm text-black">{formatDueDate(ticket.due_date)}</p>
                                    </div>
                                </div>
                            </Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
