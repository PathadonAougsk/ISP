"use client";
import { useState } from "react";
import { putTicket, type TicketRow } from "@/lib/ticket";
import { postTask } from "@/lib/task";
import type { Category } from "@/lib/category";
import { outranks, type AccountRole, type Member } from "@/lib/account";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/icon";
import DateInput from "@/components/request-table/DateInput";
import {
  fieldClass,
  FormButton,
  FormField,
  FormFooter,
  FormHeader,
  ReadOnlyBox,
} from "@/components/request-table/FormParts";
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
    ticket.createdById === currentUserId && 
    (ticket.status === "Pending" || ticket.status === "Rejected");

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
      setTaskSubmitError("You can't accept or reject this ticket.");
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

    const backendStatus = newStatus === "Accepted" ? "accepted" : "rejected";
    const previousStatus =
      ticket.status === "Accepted"
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

      // 2. If accepted, create the task from the edited values
      if (newStatus === "Accepted") {
        try {
          await postTask({
            name: title,
            description: description || null,
            category_id: categoryId,
            due_date: dueDate || null,
            assignees: assignedMemberIds,
          });
        } catch (taskErr) {
          // Task failed: restore the previous status so it can be accepted again
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
        status: ticket.status === "Rejected" ? "pending" : undefined,
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
        <FormHeader title="Judge ticket" onClose={handleClose} />

        <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          <div className="flex-1 space-y-4 min-w-0">
            <FormField label="Title">
              {!canEditTicket ? (
                <ReadOnlyBox>{ticket.title}</ReadOnlyBox>
              ) : (
                <input
                  type="text"
                  value={editTicketTitle}
                  onChange={(e) => setEditTicketTitle(e.target.value)}
                  className={fieldClass}
                />
              )}
            </FormField>

            <div className="flex gap-4">
              <FormField label="Category" className="flex-1 min-w-0">
                {!canEditTicket ? (
                  <ReadOnlyBox>{ticket.category}</ReadOnlyBox>
                ) : (
                  <select
                    value={editTicketCategoryId}
                    onChange={(e) =>
                      setEditTicketCategoryId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField label="Due Date" className="flex-1 min-w-0">
                {!canEditTicket ? (
                  <ReadOnlyBox>
                    {ticket.dueDateValue
                      ? formatShortDate(ticket.dueDateValue)
                      : ticket.dueDate || "—"}
                  </ReadOnlyBox>
                ) : (
                  <DateInput
                    value={editTicketDueDate}
                    onChange={setEditTicketDueDate}
                    className={fieldClass}
                  />
                )}
              </FormField>
            </div>

            <FormField label="Description">
              {!canEditTicket ? (
                <ReadOnlyBox className="min-h-24 max-h-40!">
                  {ticket.description}
                </ReadOnlyBox>
              ) : (
                <textarea
                  value={editTicketDescription}
                  onChange={(e) => setEditTicketDescription(e.target.value)}
                  className={`${fieldClass} min-h-24 max-h-40 overflow-y-auto`}
                />
              )}
            </FormField>

            <FormField label="Created By">
              <ReadOnlyBox>{ticket.createdBy}</ReadOnlyBox>
            </FormField>
          </div>

          {canJudge && ticket.status !== "Accepted" && (
            <div className="w-72 shrink-0 self-start rounded-[20px] bg-(--panel-bg) p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-base font-bold text-black">
                  Members{" "}
                  <span className="text-green-800">{members.length}</span>
                </p>
                <button
                  type="button"
                  onClick={toggleAssignAll}
                  disabled={members.length === 0}
                  className="cursor-pointer rounded-full bg-(--primary-color-2) px-3 py-1 text-xs font-semibold text-white hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                >
                  {members.length > 0 &&
                  assignedMemberIds.length === members.length
                    ? "Clear all"
                    : "Assign all"}
                </button>
              </div>

              <p className="mb-3 text-xs text-gray-500">
                Selected members are assigned to the task when you accept.
              </p>

              <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={assignedMemberIds.includes(member.id)}
                      onChange={() => toggleAssign(member.id)}
                      className="h-4 w-4 shrink-0 accent-(--primary-color-2)"
                    />
                    <Icon src="/profile.svg" className="h-6 w-auto shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-tight text-gray-800">
                        {member.name}
                      </div>
                      <div className="truncate text-xs leading-tight text-gray-500">
                        {member.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <FormFooter error={taskSubmitError}>
          {canEditTicket && (
            <FormButton
              color="green"
              onClick={handleUpdateTicket}
              disabled={isSavingTask}
            >
              {isSavingTask ? "Saving…" : "Save Changes"}
            </FormButton>
          )}

          {canJudge && (
            <>
              <FormButton
                color="red"
                onClick={() => handleDecision("Rejected")}
                disabled={isSavingTask || ticket.status === "Rejected"}
              >
                Reject
              </FormButton>
              <FormButton
                color="green"
                onClick={() => handleDecision("Accepted")}
                disabled={isSavingTask || ticket.status === "Accepted"}
              >
                {isSavingTask ? "Saving…" : "Accept"}
              </FormButton>
            </>
          )}
        </FormFooter>
      </div>
    </SlideupFrame>
  );
}
