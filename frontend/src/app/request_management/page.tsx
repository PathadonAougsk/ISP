"use client";
import { useState } from "react";

interface Ticket {
  id: string;
  title: string;
  status: "In-process" | "Open" | "Closed";
  urgency: "Low" | "Medium" | "High";
  createdDate: string;
  lastUpdate: string;
  category: string;
  description: string;
  createdBy: string;
}

export default function RequestTable() {
  const [searchTerm, setSearchTerm]  = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const tickets: Ticket[] = [
    {
      id: "TCK-001",
      title: "Cannot upload experiment results",
      status: "In-process",
      urgency: "High",
      createdDate: "Tue 01 Sep 26, 12:00",
      lastUpdate: "Tue 01 Sep 26, 12:00",
      category: "Bug fix",
      description: "The lab will explode soon boommmmmmm",
      createdBy: "Pasin Mclaren"
    },
  ];

  const filteredTickets = tickets
    .filter((ticket) =>
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((ticket) =>
      statusFilter === "All" ? true: ticket.status === statusFilter
    );

  return (
    <div>
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="All">All</option>
        <option value="Open">Open</option>
        <option value="In-process">In-process</option>
        <option value="Closed">Closed</option>
      </select>

      <table>
        <thead>
          <tr>
            <th>Ticket-ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Urgency</th>
            <th>Created Date</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {filteredTickets.map((ticket) => (
            <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)}>
              <td>{ticket.id}</td>
              <td>{ticket.title}</td>
              <td>{ticket.status}</td>
              <td>{ticket.urgency}</td>
              <td>{ticket.createdDate}</td>
              <td>{ticket.lastUpdate}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedTicket && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Judge tickets</h2>
            <p>Title: {selectedTicket.title}</p>
            <p>Category: {selectedTicket.category}</p>
            <p>Urgency: {selectedTicket.urgency}</p>
            <p>Description: {selectedTicket.description}</p>

            <button onClick={() => setSelectedTicket(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
