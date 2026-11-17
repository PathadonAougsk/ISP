"use client";

import { useState } from "react";
import { acceptTicket, putTicket, type TicketRow } from "@/lib/ticket";
import { categoryOptions, type Category } from "@/lib/category";
import { outranks, type AccountRole, type Member } from "@/lib/account";
import DateInput from "@/components/ui/date-input";
import { Select, TextArea, TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";
import {
  dueDateEdit,
  formatDueDate,
} from "@/components/request-table/RequestList";

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
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [dueDate, setDueDate] = useState(ticket.dueDateValue);
  const [categoryId, setCategoryId] = useState<number | "">(ticket.categoryId);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const { saving, error, setError, run } = useFormSubmit();
  // date box say invalid, block submit
  const [dateInvalid, setDateInvalid] = useState(false);
  const [action, setAction] = useState<"update" | "accept" | "reject" | null>(
    null,
  );

  const canEdit =
    ticket.createdById === currentUserId &&
    (ticket.status === "Pending" || ticket.status === "Rejected");

  // only role higher than creator can judge, pending only. creator not found = nobody
  const creatorRole = members.find((m) => m.id === ticket.createdById)?.role;
  const canJudge =
    ticket.status === "Pending" &&
    !!creatorRole &&
    outranks(currentRole, creatorRole);

  const { changed: dueDateChanged, payload: dueDatePayload } = dueDateEdit(
    dueDate,
    ticket,
  );

  const hasChanges =
    title.trim() !== ticket.title ||
    (description || "") !== (ticket.description || "") ||
    dueDateChanged ||
    categoryId !== ticket.categoryId ||
    ticket.status === "Rejected";

  async function handleDecision(
    newStatus: TicketRow["status"],
    close: () => void,
  ) {
    if (ticket.status === newStatus) return;
    if (!canJudge) {
      setError("You can't accept or reject this ticket.");
      return;
    }

    // Use the edited form values when the user can edit, otherwise the saved ones
    const name = canEdit ? title.trim() : ticket.title;
    const text = canEdit ? description : ticket.description;
    const category = canEdit ? categoryId : ticket.categoryId;
    const due = canEdit ? dueDatePayload : ticket.dueDateIso;

    if (!name || category === "") {
      setError("Title and category are required.");
      return;
    }

    setAction(newStatus === "Accepted" ? "accept" : "reject");
    const ok = await run(async () => {
      // Edits and the new status are saved together
      const values = {
        name,
        description: text || null,
        category_id: category,
        due_date: due,
      };

      if (newStatus === "Accepted") {
        await acceptTicket(ticket.id, { ...values, assignees: assignedIds });
        onTaskCreated();
      } else {
        await putTicket(ticket.id, { ...values, status: "rejected" });
      }
    }, "Failed to update ticket");

    if (ok) {
      onSaved();
      close();
    }
  }

  async function handleUpdate(close: () => void) {
    if (!hasChanges) return;

    if (!title.trim() || categoryId === "") {
      setError("Title and category are required.");
      return;
    }

    setAction("update");
    const ok = await run(
      () =>
        putTicket(ticket.id, {
          name: title.trim(),
          description: description || null,
          category_id: categoryId,
          due_date: dueDatePayload,
          status: ticket.status === "Rejected" ? "pending" : undefined,
        }),
      "Failed to update ticket",
    );

    if (ok) {
      onSaved();
      close();
    }
  }

  return (
    <FormModal
      title="Judge ticket"
      id={ticket.id}
      onClose={onClose}
      error={error}
      footer={(close) => (
        <>
          {canEdit && (
            <FormButton
              variant="green"
              onClick={() => handleUpdate(close)}
              disabled={saving || !hasChanges || dateInvalid}
            >
              {saving && action === "update" ? "Saving…" : "Save"}
            </FormButton>
          )}

          {canJudge && (
            <>
              <FormButton
                variant="red"
                onClick={() => handleDecision("Rejected", close)}
                disabled={saving || ticket.status === "Rejected"}
              >
                {saving && action === "reject" ? "Rejecting…" : "Reject"}
              </FormButton>
              <FormButton
                variant="green"
                onClick={() => handleDecision("Accepted", close)}
                disabled={saving || ticket.status === "Accepted"}
              >
                {saving && action === "accept" ? "Accepting…" : "Accept"}
              </FormButton>
            </>
          )}
        </>
      )}
    >
      <FormColumn>
        <TextInput
          name="title"
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Enter a title"
          maxLength={255}
          readOnly={!canEdit}
        />

        <div className="flex flex-wrap gap-4">
          <Select
            label="Category"
            className="min-w-35 flex-1"
            value={categoryId}
            onChange={(value) => setCategoryId(value ? Number(value) : "")}
            options={categoryOptions(categories)}
            placeholder={{ value: "", label: "Select a category" }}
            readOnly={!canEdit}
            readOnlyText={ticket.category}
          />

          <DateInput
            label="Due Date"
            className="min-w-35 flex-1"
            value={dueDate}
            onChange={setDueDate}
            onValidityChange={setDateInvalid}
            readOnly={!canEdit}
            readOnlyText={formatDueDate(ticket)}
          />

          <TextInput
            name="created_by"
            label="Created By"
            className="min-w-35 flex-1"
            value={ticket.createdBy}
            readOnly
          />
        </div>

        <TextArea
          name="description"
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add more details"
          maxLength={1000}
          readOnly={!canEdit}
          grow
        />
      </FormColumn>

      {canJudge && ticket.status !== "Accepted" && (
        <MemberPanel
          members={members}
          selectedIds={assignedIds}
          onChange={setAssignedIds}
          hint="Selected members are assigned to the task when you accept."
        />
      )}
    </FormModal>
  );
}
