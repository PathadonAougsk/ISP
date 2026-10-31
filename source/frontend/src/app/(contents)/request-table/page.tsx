"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount, useMembers } from "@/lib/account";
import {
  getTicketRowById,
  useTickets,
  type TicketRow,
  type TicketStatus,
} from "@/lib/ticket";
import {
  getTaskRowById,
  useTasks,
  type TaskRow,
  type TaskStatus,
} from "@/lib/task";
import { useCategories } from "@/lib/category";
import TicketTable from "@/components/request-table/TicketTable";
import TaskTable from "@/components/request-table/TaskTable";
import TicketDetailModal from "@/components/request-table/TicketDetailModal";
import TaskDetailModal from "@/components/request-table/TaskDetailModal";
import CreateTicketModal from "@/components/request-table/CreateTicketModal";
import CreateTaskModal from "@/components/request-table/CreateTaskModal";
import {
  SlideupCloseButton,
  SlideupFrame,
  useSlideupClose,
} from "@/components/modal_slideup";
import { Toggle } from "@/components/dashboard/view_toggle";

type Tab = "ticket" | "task";

// remove ?type=&id= from url, so refresh dont reopen the modal
function clearLinkParams() {
  window.history.replaceState(null, "", window.location.pathname);
}

// shown when the id from the url cant be fetched
function LinkErrorModal({ onClose }: { onClose: () => void }) {
  const { isClosing, handleClose } = useSlideupClose(onClose);

  return (
    <SlideupFrame
      isClosing={isClosing}
      onClose={handleClose}
      className="flex flex-col"
    >
      <div className="flex justify-end pb-2">
        <SlideupCloseButton onClose={handleClose} />
      </div>
      <p className="py-6 text-center text-base font-medium text-gray-500">
        Failed to fetch
      </p>
    </SlideupFrame>
  );
}

export default function RequestTable() {
  const [tab, setTab] = useState<Tab>("ticket");

  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [linkError, setLinkError] = useState(false);

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

  // open modal from link such as /request-table?type=task&id=12
  useEffect(() => {
    if (meLoading) return;

    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const id = Number(params.get("id"));

    if ((type !== "task" && type !== "ticket") || !Number.isInteger(id)) return;
    if (id <= 0) return;

    let cancelled = false;
    setTab(type);

    async function openFromLink() {
      try {
        if (type === "task") {
          const row = await getTaskRowById(id);
          if (!cancelled) setSelectedTask(row);
        } else {
          const row = await getTicketRowById(id, userRole);
          if (!cancelled) setSelectedTicket(row);
        }
      } catch {
        if (!cancelled) setLinkError(true);
      }
    }

    openFromLink();

    return () => {
      cancelled = true;
    };
  }, [meLoading, userRole]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="p-6 space-y-6">
        <Toggle
          labels={["Tickets", "Tasks"]}
          methods={[() => setTab("ticket"), () => setTab("task")]}
          selectedIndex={tab === "ticket" ? 0 : 1}
          ariaLabel="Request table tab"
          widthClassName="w-64"
        />

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
          currentRole={account?.role ?? "Lab User"}
          currentUserId={currentUserId}
          members={members}
          categories={categories}
          onClose={() => {
            clearLinkParams();
            setSelectedTicket(null);
          }}
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
          onClose={() => {
            clearLinkParams();
            setSelectedTask(null);
          }}
          onSaved={() => setTasksReloadKey((k) => k + 1)}
        />
      )}

      {linkError && (
        <LinkErrorModal
          onClose={() => {
            clearLinkParams();
            setLinkError(false);
          }}
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
