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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedIds, setNewTaskAssignedIds] = useState<string[]>([]);

  // Task table search + filter
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("All");

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
    {
      id: "TCK-002",
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
    if (!newTaskTitle.trim()) return;

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
      statusFilter === "All" ? true : ticket.status === statusFilter
    );

  const taskCategories = Array.from(
    new Set(tasks.map((t) => t.category).filter(Boolean))
  );

  const filteredTasks = tasks
    .filter((task) =>
      task.title.toLowerCase().includes(taskSearchTerm.toLowerCase())
    )
    .filter((task) =>
      taskCategoryFilter === "All" ? true : task.category === taskCategoryFilter
    );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="p-6 space-y-6">
        {/* My Tickets section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center">My Tickets</h2>

            <div className="h-9 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="All">All</option>
                <option value="Open">Open</option>
                <option value="In-process">In-process</option>
                <option value="Closed">Closed</option>
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
                  <th className="px-4 py-2">Urgency</th>
                  <th className="px-4 py-2">Created Date</th>
                  <th className="px-4 py-2">Last Update</th>
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
                    className="border-b border-gray-200 last:border-b-0 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">{ticket.id}</td>
                    <td className="px-4 py-3">{ticket.title}</td>
                    <td className="px-4 py-3">{ticket.status}</td>
                    <td className="px-4 py-3">{ticket.urgency}</td>
                    <td className="px-4 py-3">{ticket.createdDate}</td>
                    <td className="px-4 py-3">{ticket.lastUpdate}</td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
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

        {/* My Task section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-9 text-lg font-semibold flex items-center gap-2">
              My Task
              <button
                onClick={() => setIsCreatingTask(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-gray-600"
              >
                +
              </button>
            </h2>

            <div className="h-9 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search"
                value={taskSearchTerm}
                onChange={(e) => setTaskSearchTerm(e.target.value)}
                className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              />

              <select
                value={taskCategoryFilter}
                onChange={(e) => setTaskCategoryFilter(e.target.value)}
                className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="All">All</option>
                {taskCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-(--primary-color-2) text-white text-left text-sm">
                  <th className="px-4 py-2">Task-ID</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Assigned</th>
                  <th className="px-4 py-2">Created Date</th>
                  <th className="px-4 py-2">Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-200 last:border-b-0 text-sm">
                    <td className="px-4 py-3">{task.id}</td>
                    <td className="px-4 py-3">{task.title}</td>
                    <td className="px-4 py-3">{task.description}</td>
                    <td className="px-4 py-3">{task.category}</td>
                    <td className="px-4 py-3">{task.assignedTo}</td>
                    <td className="px-4 py-3">{task.createdDate}</td>
                    <td className="px-4 py-3">{task.lastUpdate}</td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-gray-400"
                    >
                      No tasks yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Judge tickets modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] flex flex-col">
            <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
              Judge tickets
            </div>

            <div className="flex gap-6 p-6 flex-1">
              {/* Left column: form fields */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm">
                    {selectedTicket.title}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm">
                      {selectedTicket.category}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Urgency</label>
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm">
                      {selectedTicket.urgency}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm min-h-24">
                    {selectedTicket.description}
                  </div>
                </div>
              </div>

              {/* Right column: assign members */}
              <div className="w-64 border-l border-gray-200 pl-4">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                  <span>Assign</span>
                  <span>Members — {members.length}</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="grid grid-cols-[auto_1fr] gap-x-3 items-center"
                    >
                      <input
                        type="checkbox"
                        checked={assignedMemberIds.includes(member.id)}
                        onChange={() => toggleAssign(member.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium leading-tight">
                            {member.name}
                          </div>
                          <div className="text-xs text-gray-400 leading-tight">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer: action buttons, bottom-right */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => handleDecision("Closed")}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-gray-300 text-sm"
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision("In-process")}
                className="px-5 py-2 rounded bg-(--primary-color-1) hover:bg-gray-400 text-sm"
              >
                Revised
              </button>
              <button
                onClick={() => handleDecision("Open")}
                className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-gray-300 text-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new tasks modal */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] flex flex-col">
            <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
              Create new tasks
            </div>

            <div className="flex gap-6 p-6 flex-1">
              {/* Left column: form fields */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>

              {/* Right column: assign members */}
              <div className="w-64 border-l border-gray-200 pl-4">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                  <span>Assign</span>
                  <span>Members — {members.length}</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="grid grid-cols-[auto_1fr] gap-x-3 items-center"
                    >
                      <input
                        type="checkbox"
                        checked={newTaskAssignedIds.includes(member.id)}
                        onChange={() => toggleNewTaskAssign(member.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium leading-tight">
                            {member.name}
                          </div>
                          <div className="text-xs text-gray-400 leading-tight">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer: action buttons, bottom-right */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={resetTaskForm}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-gray-300 text-sm"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}