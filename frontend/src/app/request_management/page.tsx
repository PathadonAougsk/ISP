"use client";
import { useState } from "react";

interface Ticket {
  id: string;
  title: string;
  status: "In-process" | "Open" | "Closed";
  urgency: "Low" | "Medium" | "High";
  createdDate: string;
  lastUpdate: string;
}

export default function RequestTable() {
  const [searchTerm, setSearchTerm]  = useState("");

  const tickets: Ticket[] = [
    {
      id: "TCK-001",
      title: "Cannot upload experiment results",
      status: "In-process",
      urgency: "High",
      createdDate: "Tue 01 Sep 26, 12:00",
      lastUpdate: "Tue 01 Sep 26, 12:00",
    },
  ];

  const filteredTickets = tickets.filter((ticket) =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

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
            <tr key={ticket.id}>
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
    </div>
  )
}
