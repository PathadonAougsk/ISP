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

interface Member {
  id: string;
  name: string;
  email: string;
}

export default function RequestTable() {
  const [searchTerm, setSearchTerm]  = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([
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
  ]);

  const members: Member[] = [
    { id: "m1", name: "John Doe", email: "john.d@ku.th" },
    { id: "m2", name: "Jane Smith", email: "jane.s@ku.th" },
    { id: "m3", name: "Alex Lee", email: "alex.l@ku.th" },
    { id: "m4", name: "Sam Park", email: "sam.p@ku.th" },
    { id: "m5", name: "Chris Kim", email: "chris.k@ku.th" },
    { id: "m6", name: "Pat Ito", email: "pat.i@ku.th" },
  ];

  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);

  function toggleAssign(memberId: string) {
    setAssignedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function handleDecision(newStatus: Ticket["status"]) {
    if (!selectedTicket) return;

    setTickets((prevTickets) =>
      prevTickets.map((t) =>
        t.id === selectedTicket.id ? { ...t, status: newStatus } : t
      )
    );

    setSelectedTicket(null);
  }

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

            <button onClick={() => handleDecision("Closed")}>Reject</button>
            <button onClick={() => handleDecision("In-process")}>Revised</button>
            <button onClick={() => handleDecision("Open")}>Approve</button>
          </div>
          <div>
            <p>Assign - Members ({members.length})</p>
            {members.map((member) => (
              <label
                key={member.id}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginbottom: "8px"}}
              >
                <input
                  type="checkbox"
                  checked={assignedMemberIds.includes(member.id)}
                  onChange={() => toggleAssign(member.id)}
                />
                {member.name} <br />
                <small>{member.email}</small>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
