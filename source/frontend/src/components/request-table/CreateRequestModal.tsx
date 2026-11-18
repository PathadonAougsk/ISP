"use client";

import { useState } from "react";
import { postTask } from "@/lib/task";
import { postTicket } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import type { Member } from "@/lib/account";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";
import {
  REQUIRED_MESSAGE,
  RequestFields,
  useRequestForm,
} from "@/components/request-table/RequestForm";

// Create a task (with assignees) or a ticket. Same form, task add MemberPanel.
export default function CreateRequestModal({
  kind,
  categories,
  members = [],
  membersLoading = false,
  membersError = null,
  onClose,
  onCreated,
}: {
  kind: "task" | "ticket";
  categories: Category[];
  members?: Member[];
  membersLoading?: boolean;
  membersError?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const form = useRequestForm();
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const { saving, error, setError, run } = useFormSubmit();
  const isTask = kind === "task";

  async function handleCreate(close: () => void) {
    const values = form.values;
    if (!values) {
      setError(REQUIRED_MESSAGE);
      return;
    }

    const ok = await run(
      () =>
        isTask
          ? postTask({ ...values, assignees: assignedIds })
          : postTicket(values),
      `Failed to create ${kind}`,
    );

    if (ok) {
      onCreated();
      close();
    }
  }

  return (
    <FormModal
      title={`Create new ${kind}`}
      onClose={onClose}
      error={error}
      footer={(close) => (
        <FormButton
          variant="green"
          onClick={() => handleCreate(close)}
          disabled={saving || form.dateInvalid}
        >
          {saving ? "Creating…" : "Create"}
        </FormButton>
      )}
    >
      <FormColumn>
        <RequestFields form={form} categories={categories} />
      </FormColumn>

      {isTask && (
        <MemberPanel
          members={members}
          selectedIds={assignedIds}
          onChange={setAssignedIds}
          loading={membersLoading}
          error={membersError ? "Couldn't load members" : null}
        />
      )}
    </FormModal>
  );
}
