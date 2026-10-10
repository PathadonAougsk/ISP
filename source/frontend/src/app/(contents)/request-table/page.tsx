"use client";

import { useState } from "react";
import { useCurrentAccount, useMembers } from "@/lib/account";
import { useTickets, type TicketRow, type TicketStatus } from "@/lib/ticket";
import { useTasks, type TaskRow, type TaskStatus } from "@/lib/task";
import { useCategories } from "@/lib/category";
import TicketTable from "@/components/request-table/TicketTable";
import TaskTable from "@/components/request-table/TaskTable";
import TicketDetailModal from "@/components/request-table/TicketDetailModal";
import TaskDetailModal from "@/components/request-table/TaskDetailModal";
import CreateTicketModal from "@/components/request-table/CreateTicketModal";
import CreateTaskModal from "@/components/request-table/CreateTaskModal";

type Tab = "ticket" | "task";

export default function RequestTable() {
  const [tab, setTab] = useState<Tab>("ticket");

  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Paging + filters live here so they survive switching tabs
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | "All">("All");
  const [ticketCategoryId, setTicketCategoryId] = useState<number | "All">(
    "All",
  );
  const [taskPage, setTaskPage] = useState(1);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "All">("All");
  const [taskCategoryId, setTaskCategoryId] = useState<number | "All">("All");

  const { loading: meLoading, userRole, account } = useCurrentAccount();
  const {
    tickets,
    ticketsHasNext,
    ticketsLoading,
    ticketsError,
    setTicketsReloadKey,
  } = useTickets(
    userRole,
    meLoading,
    ticketPage,
    {
      status: ticketStatus === "All" ? undefined : ticketStatus,
      categoryId: ticketCategoryId === "All" ? undefined : ticketCategoryId,
    },
    tab === "ticket",
  );
  const { tasks, tasksHasNext, tasksLoading, tasksError, setTasksReloadKey } =
    useTasks(
      taskPage,
      {
        status: taskStatus === "All" ? undefined : taskStatus,
        categoryId: taskCategoryId === "All" ? undefined : taskCategoryId,
      },
      tab === "task",
    );
  const { members, membersLoading, membersError } = useMembers();
  const { categories } = useCategories();

  const { currentUserId } = useCurrentAccount();

  const tabClass = (t: Tab) =>
    `relative z-10 px-8 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
      tab === t ? "text-gray-900" : "text-white"
    }`;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="p-6 space-y-6">
        <div className="relative grid grid-cols-2 w-fit rounded-full bg-(--primary-color-2) p-1">
          {/* sliding white pill, move when tab change */}
          <div
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white transition-transform duration-200 ease-out ${
              tab === "task" ? "translate-x-full" : ""
            }`}
          />
          <button
            className={tabClass("ticket")}
            onClick={() => setTab("ticket")}
          >
            Tickets
          </button>
          <button className={tabClass("task")} onClick={() => setTab("task")}>
            Tasks
          </button>
        </div>

        {tab === "ticket" ? (
          <TicketTable
            tickets={tickets}
            loading={ticketsLoading}
            error={ticketsError}
            categories={categories}
            status={ticketStatus}
            onStatusChange={(s) => {
              setTicketStatus(s);
              setTicketPage(1);
            }}
            categoryId={ticketCategoryId}
            onCategoryChange={(id) => {
              setTicketCategoryId(id);
              setTicketPage(1);
            }}
            page={ticketPage}
            hasNext={ticketsHasNext}
            onPageChange={setTicketPage}
            onSelect={setSelectedTicket}
            onCreate={() => setIsCreatingTicket(true)}
            canCreate={account !== null && account.role !== "Lab Owner"}
          />
        ) : (
          <TaskTable
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            userRole={userRole}
            categories={categories}
            status={taskStatus}
            onStatusChange={(s) => {
              setTaskStatus(s);
              setTaskPage(1);
            }}
            categoryId={taskCategoryId}
            onCategoryChange={(id) => {
              setTaskCategoryId(id);
              setTaskPage(1);
            }}
            page={taskPage}
            hasNext={tasksHasNext}
            onPageChange={setTaskPage}
            onSelect={setSelectedTask}
            onCreate={() => setIsCreatingTask(true)}
          />
        )}
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
