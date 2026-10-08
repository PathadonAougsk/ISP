"use client";
import { useState } from "react";
import { truncateLabel } from "@/lib/format";
import type { TicketRow } from "@/lib/ticket";

export default function TicketTable({
  tickets,
  loading,
  error,
  onSelect,
  onCreate,
}: {
  tickets: TicketRow[];
  loading: boolean;
  error: string | null;
  onSelect: (ticket: TicketRow) => void;
  onCreate: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState("All");

  const filteredTickets = tickets
    .filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter((ticket) =>
      statusFilter === "All" ? true : ticket.status === statusFilter,
    )
    .filter((ticket) =>
      ticketCategoryFilter === "All"
        ? true
        : ticket.category === ticketCategoryFilter,
    );

  const ticketCategories = Array.from(
    new Set(tickets.map((t) => t.category).filter(Boolean)),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="h-9 text-lg font-semibold flex items-center gap-2">
          My Tickets
          <button
            onClick={onCreate}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-(--primary-color-2-hover)"
          >
            +
          </button>
        </h2>

        <div className="h-9 flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          <select
            value={ticketCategoryFilter}
            onChange={(e) => setTicketCategoryFilter(e.target.value)}
            className="h-9 max-w-40 truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="All">All</option>
            {ticketCategories.map((category) => (
              <option key={category} value={category} title={category}>
                {truncateLabel(category)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 max-w-40 truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-(--primary-color-2) text-white text-left text-sm">
              <th className="px-4 py-2">Ticket-ID</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Created By</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Created Date</th>
              <th className="px-4 py-2">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => onSelect(ticket)}
                className="border-b border-gray-200 last:border-b-0 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3">{ticket.id}</td>
                <td
                  className="px-4 py-3  max-w-40 truncate"
                  title={ticket.title}
                >
                  {ticket.title}
                </td>
                <td className="px-4 py-3">{ticket.status}</td>
                <td className="px-4 py-3">{ticket.category}</td>
                <td
                  className="px-4 py-3 max-w-30 truncate"
                  title={ticket.createdBy}
                >
                  {ticket.createdBy}
                </td>
                <td className="px-4 py-3">{ticket.dueDate || "—"}</td>
                <td className="px-4 py-3">{ticket.createdDate}</td>
                <td className="px-4 py-3">{ticket.lastUpdate}</td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  Loading tickets…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-red-500"
                >
                  Couldn't load tickets: {error}
                </td>
              </tr>
            )}
            {!loading && !error && filteredTickets.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  No tickets match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
