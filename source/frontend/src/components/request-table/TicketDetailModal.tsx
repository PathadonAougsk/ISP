"use client";
import { useState } from "react";
import { putTicket, type TicketRow } from "@/lib/ticket";
import { postTask } from "@/lib/task";
import type { Category } from "@/lib/category";
import { outranks, type AccountRole, type Member } from "@/lib/account";
import DateInput from "@/components/request-table/DateInput";
import { SlideupFrame, useSlideupClose } from "@/components/modal_slideup";

export default function TicketDetailModal({
  ticket,
  currentRole,
  currentUserId,
  members,
  categories,
  onClose,
  onSaved,
  onTaskCreated,
}: {
  ticket: TicketRow;
  currentRole: AccountRole;
  currentUserId: string;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onTaskCreated: () => void;
}) {
  const { isClosing, handleClose } = useSlideupClose(onClose);
  const [editTicketTitle, setEditTicketTitle] = useState(ticket.title);
  const [editTicketDescription, setEditTicketDescription] = useState(
    ticket.description,
  );
  const [editTicketDueDate, setEditTicketDueDate] = useState(
    ticket.dueDateValue,
  );
  const [editTicketCategoryId, setEditTicketCategoryId] = useState<number | "">(
    ticket.categoryId,
  );
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskSubmitError, setTaskSubmitError] = useState<string | null>(null);

  const canEditTicket =
    ticket.createdById === currentUserId && ticket.status === "Pending";

  // only role higher than creator can judge. creator not found = nobody
  const creatorRole = members.find((m) => m.id === ticket.createdById)?.role;
  const canJudge = !!creatorRole && outranks(currentRole, creatorRole);

  function toggleAssign(memberId: string) {
    setAssignedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  function toggleAssignAll() {
    setAssignedMemberIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id),
    );
  }

  async function handleDecision(newStatus: TicketRow["status"]) {
    if (ticket.status === newStatus) return;
    if (!canJudge) {
      setTaskSubmitError("You can't approve or reject this ticket.");
      return;
    }

    // Use the edited form values when the user can edit, otherwise the saved ones
    const title = canEditTicket ? editTicketTitle.trim() : ticket.title;
    const description = canEditTicket
      ? editTicketDescription
      : ticket.description;
    const categoryId = canEditTicket ? editTicketCategoryId : ticket.categoryId;
    const dueDate = canEditTicket ? editTicketDueDate : ticket.dueDateValue;

    if (!title || categoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }

    const backendStatus = newStatus === "Approved" ? "accepted" : "rejected";
    const previousStatus =
      ticket.status === "Approved"
        ? "accepted"
        : ticket.status === "Rejected"
          ? "rejected"
          : "pending";

    setIsSavingTask(true);
    setTaskSubmitError(null);

    try {
      // 1. Save the edits and the new status together
      await putTicket(ticket.id, {
        name: title,
        description: description || null,
        category_id: categoryId,
        due_date: dueDate || null,
        status: backendStatus,
      });

      // 2. If approved, create the task from the edited values
      if (newStatus === "Approved") {
        try {
          await postTask({
            name: title,
            description: description || null,
            category_id: categoryId,
            due_date: dueDate || null,
            assignees: assignedMemberIds,
          });
        } catch (taskErr) {
          // Task failed: restore the previous status so it can be approved again
          await putTicket(ticket.id, {
            status: previousStatus,
          }).catch(() => {});
          throw taskErr;
        }
        onTaskCreated();
      }

      onSaved();
      setAssignedMemberIds([]);
      handleClose();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to update ticket",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUpdateTicket() {
    if (!editTicketTitle.trim() || editTicketCategoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await putTicket(ticket.id, {
        name: editTicketTitle.trim(),
        description: editTicketDescription || null,
        category_id: editTicketCategoryId,
        due_date: editTicketDueDate || null,
      });
      onSaved();
      handleClose();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to update ticket",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  return (
    <SlideupFrame isClosing={isClosing} onClose={handleClose}>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-lg font-semibold">Judge ticket</h1>
        </div>

        <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              {!canEditTicket ? (
                <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                  {ticket.title}
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
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                {!canEditTicket ? (
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                    {ticket.category}
                  </div>
                ) : (
                  <select
                    value={editTicketCategoryId}
                    onChange={(e) =>
                      setEditTicketCategoryId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1">
                  Due Date
                </label>
                {!canEditTicket ? (
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                    {ticket.dueDate || "—"}
                  </div>
                ) : (
                  <DateInput
                    value={editTicketDueDate}
                    onChange={setEditTicketDueDate}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              {!canEditTicket ? (
                <div className="bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto wrap-break-word">
                  {ticket.description}
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
              <label className="block text-sm font-medium mb-1">
                Created By
              </label>
              <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word">
                {ticket.createdBy}
              </div>
            </div>
          </div>

          {canJudge && ticket.status !== "Approved" && (
            <div className="w-64 border-l border-gray-200 pl-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                <span>Members — {members.length}</span>
                <button
                  type="button"
                  onClick={toggleAssignAll}
                  disabled={members.length === 0}
                  className="px-3 py-1 rounded-full bg-(--primary-color-2) text-white normal-case hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                >
                  {members.length > 0 &&
                  assignedMemberIds.length === members.length
                    ? "Clear all"
                    : "Assign all"}
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-2 normal-case">
                Selected members are assigned to the task when you approve.
              </p>

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
                      <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0" />
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
          )}
        </div>

        {/* Footer: action buttons, bottom-right */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
          {taskSubmitError && (
            <span className="text-sm text-red-500 mr-auto">
              {taskSubmitError}
            </span>
          )}

          <button
            onClick={() => {
              setAssignedMemberIds([]);
              setTaskSubmitError(null);
              handleClose();
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

          {canJudge && (
            <>
              <button
                onClick={() => handleDecision("Rejected")}
                disabled={isSavingTask || ticket.status === "Rejected"}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-(--primary-red)"
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision("Approved")}
                disabled={isSavingTask || ticket.status === "Approved"}
                className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-(--primary-color-3)"
              >
                {isSavingTask ? "Saving…" : "Approve"}
              </button>
            </>
          )}
        </div>
      </div>
    </SlideupFrame>
  );
}
