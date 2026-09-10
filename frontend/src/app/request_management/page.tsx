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
  assignedTo: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  assignedTo: string;
  createdDate: string;
  lastUpdate: string;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedIds, setNewTaskAssignedIds] = useState<string[]>([]);

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
      createdBy: "Pasin Mclaren",
      assignedTo: "",
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

  function toggleNewTaskAssign(memberId: string) {
    setNewTaskAssignedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function handleCreateTask() {
    const newTask: Task = {
      id: `TASK-${tasks.length + 1}`,
      title: newTaskTitle,
      description: newTaskDescription,
      category: newTaskCategory,
      assignedTo: newTaskAssignedIds
        .map((id) => members.find((m) => m.id === id)?.name)
        .join(", "),
      createdDate: new Date().toLocaleString(),
      lastUpdate: new Date().toLocaleString(),
    };

    setTasks((prev) => [...prev, newTask]);
    resetTaskForm();
  }

  function resetTaskForm() {
    setNewTaskTitle("");
    setNewTaskCategory("");
    setNewTaskDescription("");
    setNewTaskAssignedIds([]);
    setIsCreatingTask(false);
  }

  function handleDecision(newStatus: Ticket["status"]) {
    if (!selectedTicket) return;

    const assignedNames = assignedMemberIds
      .map((id) => members.find((m) => m.id === id)?.name)
      .join(", "); 

    setTickets((prevTickets) =>
      prevTickets.map((t) =>
        t.id === selectedTicket.id
          ? { ...t, status: newStatus, assignedTo: assignedNames }
          : t
      )
    );

    setSelectedTicket(null);
    setAssignedMemberIds([]);
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
            <tr
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setAssignedMemberIds([]);
              }}
            >
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
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}
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

      {isCreatingTask && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create new tasks</h2>

            <input
              type="text"
              placeholder="Title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Category"
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value)}
            />
            <input
              type="text"
              placeholder="Description"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            />

            <div>
              <p>Assign - Members ({members.length})</p>
              {members.map((member) => (
                <label
                  key={member.id}
                  style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}
                >
                  <input
                    type="checkbox"
                    checked={newTaskAssignedIds.includes(member.id)}
                    onChange={() => toggleNewTaskAssign(member.id)}
                  />
                  <div>
                    <div>{member.name}</div>
                    <div>{member.email}</div>
                  </div>
                </label>
              ))}
            </div>
            
            <button onClick={resetTaskForm}>Cancel</button>
            <button onClick={handleCreateTask}>Submit</button>
          </div>
        </div>
      )}

      <div>
        <p>My Task{" "}
          <button onClick={() => setIsCreatingTask(true)}>+</button>
        </p>

        <table>
          <thead>
            <tr>
              <th>Task-ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Category</th>
              <th>Assigned</th>
              <th>Created Date</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>{task.title}</td>
                <td>{task.description}</td>
                <td>{task.category}</td>
                <td>{task.assignedTo}</td>
                <td>{task.createdDate}</td>
                <td>{task.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
