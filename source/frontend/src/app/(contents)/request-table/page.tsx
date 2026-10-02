"use client";
import { apiFetch } from "@/lib/api";
import { getMe, isAdminRole, type Account } from "@/lib/account";
import { formatDueDate } from "@/lib/format";
import { useState, useEffect } from "react";

type BackendTicketStatus = "pending" | "accepted" | "rejected" | (string & {});

type BackendTicket = {
  id: number;
  status: BackendTicketStatus;
  name: string;
  description: string | null;
  category_id: number;
  created_by: string;
  assigned_id: string | null;
  completed_by: string | null;
  created: string;
  updated: string;
  due_date: string | null;
  completed_at: string | null;
};

type BackendCategory = { id: number; name: string };
type BackendAccount = { id: string; username: string; email: string };

function mapTicketStatus(status: BackendTicketStatus): Ticket["status"] {
  switch (status) {
    case "accepted": return "Approved";
    case "rejected": return "Rejected";
    default: return "Pending";
  }
}

function toDateOnly(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function mapBackendTicket(
  bt: BackendTicket,
  categoryById: Map<number, string>,
  accountById: Map<string, string>
): Ticket {
  return {
    id: String(bt.id),
    title: bt.name,
    status: mapTicketStatus(bt.status),
    dueDate: toDateOnly(bt.due_date),
    createdDate: formatDueDate(bt.created),
    lastUpdate: formatDueDate(bt.updated),
    category: categoryById.get(bt.category_id) ?? `Category #${bt.category_id}`,
    description: bt.description ?? "",
    createdBy: accountById.get(bt.created_by) ?? bt.created_by,
    assignedTo: bt.assigned_id ? (accountById.get(bt.assigned_id) ?? bt.assigned_id) : "",
    categoryId: bt.category_id,
    createdById: bt.created_by,
  };
}

type BackendTaskStatus = "in_progress" | "completed" | (string & {});

type BackendTaskAssignee = { id: string; username: string; email: string };

type BackendTask = {
  id: number;
  name: string;
  description: string | null;
  status: BackendTaskStatus;
  category_id: number;
  created_by: string;
  completed_by: string | null;
  created: string;
  updated: string;
  completed_at: string | null;
  due_date: string | null;
  assignees: BackendTaskAssignee[];
};

function mapTaskStatus(status: BackendTaskStatus): Task["status"] {
  return status === "completed" ? "Completed" : "In_progress";
}

function mapBackendTask(
  bt: BackendTask,
  categoryById: Map<number, string>,
  accountById: Map<string, string>
): Task {
  return {
    id: String(bt.id),
    title: bt.name,
    description: bt.description ?? "",
    category: categoryById.get(bt.category_id) ?? `Category #${bt.category_id}`,
    assignedTo: bt.assignees.map((a) => a.username).join(", "),
    createdBy: accountById.get(bt.created_by) ?? bt.created_by,
    dueDate: toDateOnly(bt.due_date),
    createdDate: formatDueDate(bt.created),
    lastUpdate: formatDueDate(bt.updated),
    status: mapTaskStatus(bt.status),
    categoryId: bt.category_id,
    assigneeIds: bt.assignees.map((a) => a.id),
  };
}

function mapBackendAccount(ba: BackendAccount): Member {
  return { id: ba.id, name: ba.username, email: ba.email };
}

interface Ticket {
  id: string;
  title: string;
  status: "Pending" | "Approved" | "Rejected";
  dueDate: string;
  createdDate: string;
  lastUpdate: string;
  category: string;
  description: string;
  createdBy: string;
  assignedTo: string;
  categoryId: number;
  createdById: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  assignedTo: string;
  createdBy: string;
  dueDate: string;
  createdDate: string;
  lastUpdate: string;
  status: "In_progress" | "Completed";
  sourceTicketId?: string;
  categoryId: number;
  assigneeIds: string[];
}

interface Member {
  id: string;
  name: string;
  email: string;
}

export default function RequestTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedIds, setNewTaskAssignedIds] = useState<string[]>([]);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<number | "">("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskCategory, setEditTaskCategory] = useState("");
  const [editTaskCategoryId, setEditTaskCategoryId] = useState<number | "">("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskAssignedIds, setEditTaskAssignedIds] = useState<string[]>([]);
  const [tasksReloadKey, setTasksReloadKey] = useState(0);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskSubmitError, setTaskSubmitError] = useState<string | null>(null);
  const [editTicketTitle, setEditTicketTitle] = useState("");
  const [editTicketCategory, setEditTicketCategory] = useState("");
  const [editTicketDescription, setEditTicketDescription] = useState("");
  const [editTicketDueDate, setEditTicketDueDate] = useState("");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDueDate, setNewTicketDueDate] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("")
  const [editTicketCategoryId, setEditTicketCategoryId] = useState<number | "">("");
  const [ticketsReloadKey, setTicketsReloadKey] = useState(0);

  // Task table search + filter
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("All");

  const [me, setMe] = useState<Account | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((account) => { if (!cancelled) setMe(account ?? null); })
      .catch(() => { /* leave me as null, which falls back to Lab user */ })
      .finally(() => { if (!cancelled) setMeLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // "Lab Owner" and "Lab Admin" both count as admin
  const userRole: "Lab Admin" | "Lab user" =
    me && isAdminRole(me.role) ? "Lab Admin" : "Lab user";

  const currentUserId = me?.id ?? "";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  useEffect(() => {
    if (meLoading) return; 
    let cancelled = false;

    async function loadTickets() {
      try {
        const [ticketsRes, categoriesRes, accountsRes] = await Promise.all([
          apiFetch(userRole === "Lab Admin" ? "/ticket/?limit=0" : "/ticket/?onlyOwned=true&limit=0"),
          apiFetch("/category/").catch(() => null),
          apiFetch("/account/").catch(() => null),
        ]);

        if (!ticketsRes.ok) throw new Error(`HTTP ${ticketsRes.status}`);
        const ticketBody: { Tickets: BackendTicket[] } = await ticketsRes.json();

        const categoryById = new Map<number, string>();
        if (categoriesRes?.ok) {
          const catBody: BackendCategory[] | { Categories: BackendCategory[] } = await categoriesRes.json();
          const list = Array.isArray(catBody) ? catBody : catBody.Categories;
          list.forEach((c) => categoryById.set(c.id, c.name));
        }

        const accountById = new Map<string, string>();
        if (accountsRes?.ok) {
          const accBody: BackendAccount[] | { Accounts: BackendAccount[] } = await accountsRes.json();
          const list = Array.isArray(accBody) ? accBody : accBody.Accounts;
          list.forEach((a) => accountById.set(a.id, a.username));
        }

        if (!cancelled) {
          setTickets(ticketBody.Tickets.map((t) => mapBackendTicket(t, categoryById, accountById)));
          setTicketsError(null);
        }
      } catch (err) {
        if (!cancelled) setTicketsError(err instanceof Error ? err.message : "Failed to load tickets");
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    }

    loadTickets();
    return () => { cancelled = true; };
  }, [userRole, meLoading, ticketsReloadKey]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        const [tasksRes, categoriesRes, accountsRes] = await Promise.all([
          apiFetch("/task/"),
          apiFetch("/category/").catch(() => null),
          apiFetch("/account/").catch(() => null),
        ]);

        if (!tasksRes.ok) throw new Error(`HTTP ${tasksRes.status}`);
        const taskBody: { Tasks: BackendTask[] } = await tasksRes.json();

        const categoryById = new Map<number, string>();
        if (categoriesRes?.ok) {
          const catBody: BackendCategory[] | { Categories: BackendCategory[] } = await categoriesRes.json();
          const list = Array.isArray(catBody) ? catBody : catBody.Categories;
          list.forEach((c) => categoryById.set(c.id, c.name));
        }

        const accountById = new Map<string, string>();
        if (accountsRes?.ok) {
          const accBody: BackendAccount[] | { Accounts: BackendAccount[] } = await accountsRes.json();
          const list = Array.isArray(accBody) ? accBody : accBody.Accounts;
          list.forEach((a) => accountById.set(a.id, a.username));
        }

        if (!cancelled) {
          setTasks(taskBody.Tasks.map((t) => mapBackendTask(t, categoryById, accountById)));
          setTasksError(null);
        }
      } catch (err) {
        if (!cancelled) setTasksError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    }

    loadTasks();
    return () => { cancelled = true; };
  }, [userRole, meLoading, tasksReloadKey]);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const accountsRes = await apiFetch("/account/");
        if (!accountsRes.ok) throw new Error(`HTTP ${accountsRes.status}`);

        const accBody: BackendAccount[] | { Accounts: BackendAccount[] } = await accountsRes.json();
        const list = Array.isArray(accBody) ? accBody : accBody.Accounts;

        if (!cancelled) {
          setMembers(list.map(mapBackendAccount));
          setMembersError(null);
        }
      } catch (err) {
        if (!cancelled) setMembersError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }

    loadMembers();
    return () => { cancelled = true; };
  }, []);

  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const res = await apiFetch("/category/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body: BackendCategory[] | { Categories: BackendCategory[] } = await res.json();
        const list = Array.isArray(body) ? body : body.Categories;

        if (!cancelled) {
          setCategories(list);
          setCategoriesError(null);
        }
      } catch (err) {
        if (!cancelled) setCategoriesError(err instanceof Error ? err.message : "Failed to load categories");
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }

    loadCategories();
    return () => { cancelled = true; };
  }, []);

  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);

  function toggleAssign(memberId: string) {
    setAssignedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function toggleAssignAll() {
    setAssignedMemberIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id)
    );
  }

  function toggleNewTaskAssignAll() {
    setNewTaskAssignedIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id)
    );
  }

  function toggleEditTaskAssignAll() {
    setEditTaskAssignedIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id)
    );
  }

  function toggleNewTaskAssign(memberId: string) {
    setNewTaskAssignedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function toggleEditTaskAssign(memberId: string) {
    setEditTaskAssignedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  async function sendTask(path: string, method: "POST" | "PUT", body: object) {
    const res = await apiFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || newTaskCategoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await sendTask("/task/", "POST", {
        name: newTaskTitle.trim(),
        description: newTaskDescription || null,
        category_id: newTaskCategoryId,
        due_date: newTaskDueDate || null,
        assignees: newTaskAssignedIds,
      });
      setTasksReloadKey((k) => k + 1);
      resetTaskForm();
    } catch (err) {
      setTaskSubmitError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSavingTask(false);
    }
  }

  function resetTaskForm() {
    setNewTaskTitle("");
    setNewTaskCategory("");
    setNewTaskDescription("");
    setNewTaskAssignedIds([]);
    setNewTaskDueDate("");
    setIsCreatingTask(false);
    setNewTaskCategoryId("");
    setTaskSubmitError(null);
  }

  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSubmitError, setTicketSubmitError] = useState<string | null>(null);

  const [newTicketCategoryId, setNewTicketCategoryId] = useState<number | "">("");

  async function handleCreateTicket() {
    if (!newTicketTitle.trim() || newTicketCategoryId === "") return;

    setIsSubmittingTicket(true);
    setTicketSubmitError(null);

    try {
      const res = await apiFetch("/ticket/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTicketTitle.trim(),
          description: newTicketDescription || null,
          category_id: newTicketCategoryId,
          due_date: newTicketDueDate || null,
        }),
      });

      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.detail?.code === "quota_exhausted") {
          throw new Error("You've used up your ticket quota.");
        }
        throw new Error("You don't have permission to create a ticket.");
      }
      if (res.status === 404) {
        throw new Error("Selected category no longer exists.");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const created: BackendTicket = await res.json();

      const categoryById = new Map<number, string>(categories.map((c) => [c.id, c.name]));
      const accountById = new Map<string, string>(members.map((m) => [m.id, m.name]));

      setTickets((prev) => [...prev, mapBackendTicket(created, categoryById, accountById)]);
      resetTicketForm();
    } catch (err) {
      setTicketSubmitError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setIsSubmittingTicket(false);
    }
  }


  function resetTicketForm() {
    setNewTicketTitle("");
    setNewTicketCategoryId("");
    setNewTicketDueDate("");
    setNewTicketDescription("");
    setIsCreatingTicket(false);
  }

  function getNextTaskId(taskList: Task[]) {
    const maxNum = taskList.reduce((max, t) => {
      const num = parseInt(t.id, 10);
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `${maxNum + 1}`;
  }

  async function handleDecision(newStatus: Ticket["status"]) {
    if (!selectedTicket) return;
    if (selectedTicket.status === newStatus) return;

    // Use the edited form values when the user can edit, otherwise the saved ones
    const title = canEditTicket ? editTicketTitle.trim() : selectedTicket.title;
    const description = canEditTicket ? editTicketDescription : selectedTicket.description;
    const categoryId = canEditTicket ? editTicketCategoryId : selectedTicket.categoryId;
    const dueDate = canEditTicket ? editTicketDueDate : selectedTicket.dueDate;

    if (!title || categoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }

    const backendStatus = newStatus === "Approved" ? "accepted" : "rejected";
    const previousStatus =
      selectedTicket.status === "Approved" ? "accepted"
      : selectedTicket.status === "Rejected" ? "rejected"
      : "pending";

    setIsSavingTask(true);
    setTaskSubmitError(null);

    try {
      // 1. Save the edits and the new status together
      await sendTask(`/ticket/${selectedTicket.id}`, "PUT", {
        name: title,
        description: description || null,
        category_id: categoryId,
        due_date: dueDate || null,
        status: backendStatus,
      });

      // 2. If approved, create the task from the edited values
      if (newStatus === "Approved") {
        try {
          await sendTask("/task/", "POST", {
            name: title,
            description: description || null,
            category_id: categoryId,
            due_date: dueDate || null,
            assignees: assignedMemberIds,
          });
        } catch (taskErr) {
          // Task failed: restore the previous status so it can be approved again
          await sendTask(`/ticket/${selectedTicket.id}`, "PUT", { status: previousStatus }).catch(() => {});
          throw taskErr;
        }
        setTasksReloadKey((k) => k + 1);
      }

      setTicketsReloadKey((k) => k + 1);
      setSelectedTicket(null);
      setAssignedMemberIds([]);
    } catch (err) {
      setTaskSubmitError(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUpdateTicket() {
    if (!selectedTicket) return;
    if (!editTicketTitle.trim() || editTicketCategoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await sendTask(`/ticket/${selectedTicket.id}`, "PUT", {
        name: editTicketTitle.trim(),
        description: editTicketDescription || null,
        category_id: editTicketCategoryId,
        due_date: editTicketDueDate || null,
      });
      setTicketsReloadKey((k) => k + 1);
      setSelectedTicket(null);
    } catch (err) {
      setTaskSubmitError(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleSubmitTask() {
    if (!selectedTask) return;
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await sendTask(`/task/${selectedTask.id}`, "PUT", {
        name: selectedTask.title,
        description: selectedTask.description || null,
        status: "completed",
        category_id: selectedTask.categoryId,
        due_date: selectedTask.dueDate || null,
      });
      setTasksReloadKey((k) => k + 1);
      setSelectedTask(null);
    } catch (err) {
      setTaskSubmitError(err instanceof Error ? err.message : "Failed to submit task");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUnsubmitTask() {
    if (!selectedTask) return;
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await sendTask(`/task/${selectedTask.id}`, "PUT", {
        name: selectedTask.title,
        description: selectedTask.description || null,
        status: "in_progress",
        category_id: selectedTask.categoryId,
        due_date: selectedTask.dueDate || null,
      });
      setTasksReloadKey((k) => k + 1);
      setSelectedTask(null);
    } catch (err) {
      setTaskSubmitError(err instanceof Error ? err.message : "Failed to unsubmit task");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUpdateTask() {
    if (!selectedTask) return;
    if (!editTaskTitle.trim() || editTaskCategoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await sendTask(`/task/${selectedTask.id}`, "PUT", {
        name: editTaskTitle.trim(),
        description: editTaskDescription || null,
        status: selectedTask.status === "Completed" ? "completed" : "in_progress",
        category_id: editTaskCategoryId,
        due_date: editTaskDueDate || null,
        assignees: editTaskAssignedIds,
      });
      setTasksReloadKey((k) => k + 1);
      setSelectedTask(null);
    } catch (err) {
      setTaskSubmitError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setIsSavingTask(false);
    }
  }

  function truncateLabel(text: string, maxLength = 20) {
    return text.length > maxLength ? text.slice(0, maxLength).trim() + "…" : text;
  }

  const filteredTickets = tickets
    .filter((ticket) =>
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((ticket) =>
      statusFilter === "All" ? true : ticket.status === statusFilter
    )
    .filter((ticket) =>
      ticketCategoryFilter === "All" ? true : ticket.category === ticketCategoryFilter
    );

  const ticketCategories = Array.from(
    new Set(tickets.map((t) => t.category).filter(Boolean))
  );

  const taskCategories = Array.from(
    new Set(tasks.map((t) => t.category).filter(Boolean))
  );

  const canEditTicket =
    !!selectedTicket &&
    (userRole === "Lab Admin" ||  
      (selectedTicket.createdById === currentUserId && selectedTicket.status === "Pending"));

  const filteredTasks = tasks
    .filter((task) =>
      task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.id.toLowerCase().includes(taskSearchTerm.toLowerCase())
    )
    .filter((task) =>
      taskCategoryFilter === "All" ? true : task.category === taskCategoryFilter
    )
    .filter((task) =>
      taskStatusFilter === "All" ? true : task.status === taskStatusFilter
    )
    .filter((task) =>
      userRole === "Lab Admin" ? true : task.assigneeIds.includes(currentUserId)
    );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="p-6 space-y-6">
        {/* My Tickets section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-9 text-lg font-semibold flex items-center gap-2">
              My Tickets
              {(userRole === "Lab Admin" || userRole === "Lab user") && (
                <button
                  onClick={() => setIsCreatingTicket(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-(--primary-color-2-hover)"
                >
                  +
                </button>
              )}
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
                className="h-9 max-w-[160px] truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                className="h-9 max-w-[160px] truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setTaskSubmitError(null);
                      setAssignedMemberIds([]);
                      setEditTicketTitle(ticket.title);
                      setEditTicketCategory(ticket.category);
                      setEditTicketDescription(ticket.description);
                      setEditTicketDueDate(ticket.dueDate);
                      setEditTicketCategoryId(ticket.categoryId);
                    }}
                    className="border-b border-gray-200 last:border-b-0 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">{ticket.id}</td>
                    <td className="px-4 py-3  max-w-[160px] truncate" title={ticket.title}>
                      {ticket.title}
                    </td>
                    <td className="px-4 py-3">{ticket.status}</td>
                    <td className="px-4 py-3">{ticket.category}</td>
                    <td className="px-4 py-3 max-w-[120px] truncate" title={ticket.createdBy}>
                      {ticket.createdBy}
                    </td>
                    <td className="px-4 py-3">{ticket.dueDate || "—"}</td>
                    <td className="px-4 py-3">{ticket.createdDate}</td>
                    <td className="px-4 py-3">{ticket.lastUpdate}</td>
                  </tr>
                ))}
                {ticketsLoading && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">Loading tickets…</td></tr>
                )}
                {ticketsError && !ticketsLoading && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-red-500">Couldn't load tickets: {ticketsError}</td></tr>
                )}
                {!ticketsLoading && !ticketsError && filteredTickets.length === 0 && (
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

        {/* My Task section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-9 text-lg font-semibold flex items-center gap-2">
              My Task
              {userRole === "Lab Admin" && (
              <button
                onClick={() => setIsCreatingTask(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-(--primary-color-2-hover)"
              >
                +
              </button>
              )}
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
                className="h-9 max-w-[160px] truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="All">All</option>
                {taskCategories.map((category) => (
                  <option key={category} value={category} title={category}>
                    {truncateLabel(category)}
                  </option>
                ))}
              </select>

              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="h-9 max-w-[160px] truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="All">All</option>
                <option value="In_progress">In progress</option>
                <option value="Completed">Completed</option>
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
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created By</th>
                  <th className="px-4 py-2">Due Date</th>
                  <th className="px-4 py-2">Created Date</th>
                  <th className="px-4 py-2">Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setEditTaskCategoryId(task.categoryId);
                      setTaskSubmitError(null);
                      setEditTaskTitle(task.title);
                      setEditTaskCategory(task.category);
                      setEditTaskDescription(task.description);
                      setEditTaskDueDate(task.dueDate);
                      setEditTaskAssignedIds(task.assigneeIds);
                    }}
                    className="border-b border-gray-200 last:border-b-0 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">{task.id}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate" title={task.title}>
                      {task.title}
                    </td>
                    <td className="px-4 py-3 	max-w-[200px] truncate" title={task.description}>
                      {task.description}
                    </td>
                    <td className="px-4 py-3 max-w-[100px] truncate" title={task.category}>
                      {task.category}
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={task.assignedTo}>
                      {task.assignedTo}
                    </td>
                    <td className="px-4 py-3">{task.status}</td>
                    <td className="px-4 py-3 max-w-[120px] truncate" title={task.createdBy}>
                      {task.createdBy}
                    </td>
                    <td className="px-4 py-3">{task.dueDate || "—"}</td>
                    <td className="px-4 py-3">{task.createdDate}</td>
                    <td className="px-4 py-3">{task.lastUpdate}</td>
                  </tr>
                ))}
                {tasksLoading && (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-400">Loading tasks…</td></tr>
                )}
                {tasksError && !tasksLoading && (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-sm text-red-500">Couldn't load tasks: {tasksError}</td></tr>
                )}
                {!tasksLoading && !tasksError && filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-400">
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
              Judge tickets
            </div>

            <div className="flex gap-6 p-6 flex-1">
              <div className="flex-1 space-y-4 min-w-0">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  {!canEditTicket ? (
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                      {selectedTicket.title}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={editTicketTitle}
                      onChange={(e) => setEditTicketTitle(e.target.value)}
                      className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-1">Category</label>
                    {!canEditTicket ? (
                      <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                        {selectedTicket.category}
                      </div>
                    ) : (
                      <select
                        value={editTicketCategoryId}
                        onChange={(e) => setEditTicketCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    {!canEditTicket ? (
                      <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                        {selectedTicket.dueDate || "—"}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={editTicketDueDate}
                        onChange={(e) => setEditTicketDueDate(e.target.value)}
                        className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  {!canEditTicket ? (
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto break-words">
                      {selectedTicket.description}
                    </div>
                  ) : (
                    <textarea
                      value={editTicketDescription}
                      onChange={(e) => setEditTicketDescription(e.target.value)}
                      className="w-full bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Created By</label>
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words">
                    {selectedTicket.createdBy}
                  </div>
                </div>
              </div>

              {userRole === "Lab Admin" && selectedTicket.status !== "Approved" && (
                <div className="w-64 border-l border-gray-200 pl-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                    <span>Members — {members.length}</span>
                    <button
                      type="button"
                      onClick={toggleAssignAll}
                      disabled={members.length === 0}
                      className="px-3 py-1 rounded-full bg-(--primary-color-2) text-white normal-case hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                    >
                      {members.length > 0 && assignedMemberIds.length === members.length ? "Clear all" : "Assign all"}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mb-2 normal-case">
                    Selected members are assigned to the task when you approve.
                  </p>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {members.map((member) => (
                      <label key={member.id} className="grid grid-cols-[auto_1fr] gap-x-3 items-center">
                        <input
                          type="checkbox"
                          checked={assignedMemberIds.includes(member.id)}
                          onChange={() => toggleAssign(member.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium leading-tight">{member.name}</div>
                            <div className="text-xs text-gray-400 leading-tight">{member.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer: action buttons, bottom-right */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
              {taskSubmitError && (
                <span className="text-sm text-red-500 mr-auto">{taskSubmitError}</span>
              )}

              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setAssignedMemberIds([]);
                  setTaskSubmitError(null);
                }}
                disabled={isSavingTask}
                className="px-5 py-2 rounded bg-(--primary-color-2) hover:bg-(--primary-color-2-hover) text-sm disabled:opacity-50"
              >
                Cancel
              </button>

              {canEditTicket && (
                <button
                  onClick={handleUpdateTicket}
                  disabled={isSavingTask}
                  className="px-5 py-2 rounded bg-(--primary-color-2) text-black hover:bg-(--primary-color-2-hover) text-sm disabled:opacity-50"
                >
                  {isSavingTask ? "Saving…" : "Save Changes"}
                </button>
              )}

              {userRole === "Lab Admin" && (
                <>
                  <button
                    onClick={() => handleDecision("Rejected")}
                    disabled={isSavingTask || selectedTicket.status === "Rejected"}
                    className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-(--primary-red)"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecision("Approved")}
                    disabled={isSavingTask || selectedTicket.status === "Approved"}
                    className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-(--primary-color-3)"
                  >
                    {isSavingTask ? "Saving…" : "Approve"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create new ticket modal */}
      {isCreatingTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
              Create new ticket
            </div>

            <div className="flex gap-6 p-6 flex-1">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newTicketCategoryId}
                    onChange={(e) => setNewTicketCategoryId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTicketDueDate}
                    onChange={(e) => setNewTicketDueDate(e.target.value)}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newTicketDescription}
                    onChange={(e) => setNewTicketDescription(e.target.value)}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
              {ticketSubmitError && (
                <span className="text-sm text-red-500 mr-auto">{ticketSubmitError}</span>
              )}
              <button
                onClick={resetTicketForm}
                disabled={isSubmittingTicket}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={isSubmittingTicket}
                className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50"
              >
                {isSubmittingTicket ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new tasks modal */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] max-h-[85vh] overflow-y-auto flex flex-col">
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
                  <select
                    value={newTaskCategoryId}
                    onChange={(e) => setNewTaskCategoryId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
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
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                  <span>Members — {members.length}</span>
                  <button
                    type="button"
                    onClick={toggleNewTaskAssignAll}
                    disabled={members.length === 0}
                    className="px-3 py-1 rounded-full bg-(--primary-color-2) text-white normal-case hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                  >
                    {members.length > 0 && newTaskAssignedIds.length === members.length ? "Clear all" : "Assign all"}
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {membersLoading && (
                    <div className="text-xs text-gray-400">Loading members…</div>
                  )}
                  {membersError && !membersLoading && (
                    <div className="text-xs text-red-500">Couldn't load members</div>
                  )}
                  {!membersLoading && !membersError && members.map((member) => (
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
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
              {taskSubmitError && (
                <span className="text-sm text-red-500 mr-auto">{taskSubmitError}</span>
              )}
              <button
                onClick={resetTaskForm}
                disabled={isSavingTask}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={isSavingTask}
                className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50"
              >
                {isSavingTask ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail / submit modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
              Task detail
            </div>

            <div className="flex gap-6 p-6 flex-1">
              <div className="flex-1 space-y-4 min-w-0">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  {userRole === "Lab Admin" ? (
                    <input
                      type="text"
                      value={editTaskTitle}
                      onChange={(e) => setEditTaskTitle(e.target.value)}
                      className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                      {selectedTask.title}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-1">Category</label>
                    {userRole === "Lab Admin" ? (
                      <select
                        value={editTaskCategoryId}
                        onChange={(e) => setEditTaskCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                        {selectedTask.category}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                      {selectedTask.status}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    {userRole === "Lab Admin" ? (
                      <input
                        type="date"
                        value={editTaskDueDate}
                        onChange={(e) => setEditTaskDueDate(e.target.value)}
                        className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    ) : (
                      <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                        {selectedTask.dueDate || "—"}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Created By</label>
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words">
                    {selectedTask.createdBy}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  {userRole === "Lab Admin" ? (
                    <textarea
                      value={editTaskDescription}
                      onChange={(e) => setEditTaskDescription(e.target.value)}
                      className="w-full bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto break-words">
                      {selectedTask.description}
                    </div>
                  )}
                </div>

                {userRole !== "Lab Admin" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Assigned</label>
                    <div className="bg-gray-100 rounded px-3 py-2 text-sm break-words max-h-20 overflow-y-auto">
                      {selectedTask.assignedTo || "—"}
                    </div>
                  </div>
                )}
              </div>

              {userRole === "Lab Admin" && (
                <div className="w-64 border-l border-gray-200 pl-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                    <span>Members — {members.length}</span>
                    <button
                      type="button"
                      onClick={toggleEditTaskAssignAll}
                      disabled={members.length === 0}
                      className="px-3 py-1 rounded-full bg-(--primary-color-2) text-white normal-case hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                    >
                      {members.length > 0 && editTaskAssignedIds.length === members.length ? "Clear all" : "Assign all"}
                    </button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {members.map((member) => (
                      <label key={member.id} className="grid grid-cols-[auto_1fr] gap-x-3 items-center">
                        <input
                          type="checkbox"
                          checked={editTaskAssignedIds.includes(member.id)}
                          onChange={() => toggleEditTaskAssign(member.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium leading-tight">{member.name}</div>
                            <div className="text-xs text-gray-400 leading-tight">{member.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
              {taskSubmitError && (
                <span className="text-sm text-red-500 mr-auto">{taskSubmitError}</span>
              )}

              <button
                onClick={() => {
                  setSelectedTask(null);
                  setTaskSubmitError(null);
                }}
                disabled={isSavingTask}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
              >
                Cancel
              </button>

              {userRole === "Lab Admin" && (
                <button
                  onClick={handleUpdateTask}
                  disabled={isSavingTask}
                  className="px-5 py-2 rounded bg-(--primary-color-2) text-black hover:bg-(--primary-color-2-hover) text-sm disabled:opacity-50"
                >
                  {isSavingTask ? "Saving…" : "Save Changes"}
                </button>
              )}

              {(userRole !== "Lab Admin" || selectedTask.assigneeIds.includes(currentUserId)) && (
                selectedTask.status === "Completed" ? (
                  <button
                    onClick={handleUnsubmitTask}
                    disabled={isSavingTask}
                    className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
                  >
                    {isSavingTask ? "Saving…" : "Unsubmit"}
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitTask}
                    disabled={isSavingTask}
                    className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50"
                  >
                    {isSavingTask ? "Saving…" : "Submit"}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
