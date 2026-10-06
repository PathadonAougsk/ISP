"use client";
import { useState } from "react";
import { useCurrentAccount } from "@/lib/current_account";
import { useTickets } from "@/lib/use_tickets";
import { useTasks } from "@/lib/use_tasks";
import { useMembers } from "@/lib/use_members";
import { useCategories } from "@/lib/category";
import type { TicketRow } from "@/lib/ticket";
import type { TaskRow } from "@/lib/task";
import TicketTable from "@/components/request-table/TicketTable";
import TaskTable from "@/components/request-table/TaskTable";
import TicketDetailModal from "@/components/request-table/TicketDetailModal";
import TaskDetailModal from "@/components/request-table/TaskDetailModal";
import CreateTicketModal from "@/components/request-table/CreateTicketModal";
import CreateTaskModal from "@/components/request-table/CreateTaskModal";

export default function RequestTable() {
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const { loading: meLoading, userRole, currentUserId } = useCurrentAccount();
  const { tickets, ticketsLoading, ticketsError, setTicketsReloadKey } =
    useTickets(userRole, meLoading);
  const { tasks, tasksLoading, tasksError, setTasksReloadKey } = useTasks();
  const { members, membersLoading, membersError } = useMembers();
  const { categories } = useCategories();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="p-6 space-y-6">
        <TicketTable
          tickets={tickets}
          loading={ticketsLoading}
          error={ticketsError}
          onSelect={setSelectedTicket}
          onCreate={() => setIsCreatingTicket(true)}
        />

        <TaskTable
          tasks={tasks}
          loading={tasksLoading}
          error={tasksError}
          userRole={userRole}
          currentUserId={currentUserId}
          onSelect={setSelectedTask}
          onCreate={() => setIsCreatingTask(true)}
        />
      </div>

      {selectedTicket && (
        <TicketDetailModal
          key={selectedTicket.id}
          ticket={selectedTicket}
          userRole={userRole}
          currentUserId={currentUserId}
          members={members}
          categories={categories}
          onClose={() => setSelectedTicket(null)}
          onSaved={() => setTicketsReloadKey((k) => k + 1)}
          onTaskCreated={() => setTasksReloadKey((k) => k + 1)}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          key={selectedTask.id}
          task={selectedTask}
          userRole={userRole}
          currentUserId={currentUserId}
          members={members}
          categories={categories}
          onClose={() => setSelectedTask(null)}
          onSaved={() => setTasksReloadKey((k) => k + 1)}
        />
      )}

      {isCreatingTicket && (
        <CreateTicketModal
          categories={categories}
          onClose={() => setIsCreatingTicket(false)}
          onCreated={() => setTicketsReloadKey((k) => k + 1)}
        />
      )}

      {isCreatingTask && (
        <CreateTaskModal
          categories={categories}
          members={members}
          membersLoading={membersLoading}
          membersError={membersError}
          onClose={() => setIsCreatingTask(false)}
          onCreated={() => setTasksReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
