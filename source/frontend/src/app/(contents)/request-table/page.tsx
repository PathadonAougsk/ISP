"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCurrentAccount, useMembers } from "@/lib/account";
import { useCategories } from "@/lib/category";
import { getTicketRowById, useTickets, type TicketRow } from "@/lib/ticket";
import { getTaskRowById, useTasks, type TaskRow } from "@/lib/task";
import { CloseButton, Slideup } from "@/components/ui/slideup";
import Toggle from "@/components/ui/toggle";
import CreateTaskModal from "@/components/request-table/CreateTaskModal";
import CreateTicketModal from "@/components/request-table/CreateTicketModal";
import {
  toQuery,
  useTableFilters,
} from "@/components/request-table/RequestList";
import TaskDetailModal from "@/components/request-table/TaskDetailModal";
import TaskTable from "@/components/request-table/TaskTable";
import TicketDetailModal from "@/components/request-table/TicketDetailModal";
import TicketTable from "@/components/request-table/TicketTable";

type Tab = "ticket" | "task";

// remove /type/id from url, so refresh dont reopen the modal
function clearLinkParams() {
  window.history.replaceState(null, "", "/request-table");
}

// shown when the id from the url cant be fetched
function LinkErrorModal({ onClose }: { onClose: () => void }) {
  return (
    <Slideup onClose={onClose}>
      {(close) => (
        <>
          <div className="flex justify-end pb-2">
            <CloseButton onClose={close} />
          </div>
          <p className="py-6 text-center text-base font-medium text-gray-500">
            Failed to fetch
          </p>
        </>
      )}
    </Slideup>
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
  const ticketView = useTableFilters();
  const taskView = useTableFilters();

  const {
    loading: meLoading,
    userRole,
    account,
    currentUserId,
  } = useCurrentAccount();

  const {
    tickets,
    ticketsHasNext,
    ticketsTotalPages,
    ticketsLoading,
    ticketsError,
    reloadTickets,
  } = useTickets(
    userRole,
    meLoading,
    ticketView.filters.page,
    toQuery(ticketView.filters),
    tab === "ticket",
  );

  const {
    tasks,
    tasksHasNext,
    tasksTotalPages,
    tasksLoading,
    tasksError,
    reloadTasks,
  } = useTasks(
    taskView.filters.page,
    toQuery(taskView.filters),
    tab === "task",
  );

  const { members, membersLoading, membersError } = useMembers();
  const { categories } = useCategories();

  const pathname = usePathname();

  // open modal from link such as /request-table/task/12
  useEffect(() => {
    if (meLoading) return;

    const segments = pathname.split("/");
    const type = segments[2];
    const id = Number(segments[3]);

    if (
      (type !== "task" && type !== "ticket") ||
      !Number.isInteger(id) ||
      id <= 0
    )
      return;

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
  }, [meLoading, userRole, pathname]);

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-white px-5 pt-5 text-gray-900">
      <Toggle
        options={[
          { label: "Tickets", onClick: () => setTab("ticket") },
          { label: "Tasks", onClick: () => setTab("task") },
        ]}
        selectedIndex={tab === "ticket" ? 0 : 1}
        ariaLabel="Request table tab"
        widthClassName="w-64"
      />

      <div className="min-h-0 flex-1">
        {tab === "ticket" ? (
          <TicketTable
            tickets={tickets}
            loading={ticketsLoading}
            error={ticketsError}
            categories={categories}
            filters={ticketView.filters}
            onFilterChange={ticketView.setFilter}
            onPageChange={ticketView.setPage}
            hasNext={ticketsHasNext}
            totalPages={ticketsTotalPages}
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
            filters={taskView.filters}
            onFilterChange={taskView.setFilter}
            onPageChange={taskView.setPage}
            hasNext={tasksHasNext}
            totalPages={tasksTotalPages}
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
          onSaved={reloadTickets}
          onTaskCreated={reloadTasks}
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
          onSaved={reloadTasks}
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
          onCreated={reloadTickets}
        />
      )}

      {isCreatingTask && (
        <CreateTaskModal
          categories={categories}
          members={members}
          membersLoading={membersLoading}
          membersError={membersError}
          onClose={() => setIsCreatingTask(false)}
          onCreated={reloadTasks}
        />
      )}
    </div>
  );
}
