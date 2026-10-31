"use client";
import { useState } from "react";
import { postTicket } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import DateInput from "@/components/request-table/DateInput";
import {
  fieldClass,
  FormButton,
  FormField,
  FormFooter,
  FormHeader,
} from "@/components/request-table/FormParts";
import { SlideupFrame, useSlideupClose } from "@/components/modal_slideup";

export default function CreateTicketModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { isClosing, handleClose } = useSlideupClose(onClose);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDueDate, setNewTicketDueDate] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [newTicketCategoryId, setNewTicketCategoryId] = useState<number | "">(
    "",
  );
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSubmitError, setTicketSubmitError] = useState<string | null>(
    null,
  );

  async function handleCreateTicket() {
    if (!newTicketTitle.trim() || newTicketCategoryId === "") return;

    setIsSubmittingTicket(true);
    setTicketSubmitError(null);

    try {
      await postTicket({
        name: newTicketTitle.trim(),
        description: newTicketDescription || null,
        category_id: newTicketCategoryId,
        due_date: newTicketDueDate || null,
      });

      onCreated();
      resetTicketForm();
    } catch (err) {
      setTicketSubmitError(
        err instanceof Error ? err.message : "Failed to create ticket",
      );
    } finally {
      setIsSubmittingTicket(false);
    }
  }

  function resetTicketForm() {
    setNewTicketTitle("");
    setNewTicketCategoryId("");
    setNewTicketDueDate("");
    setNewTicketDescription("");
    handleClose();
  }

  return (
    <SlideupFrame isClosing={isClosing} onClose={handleClose}>
      <div className="flex flex-col h-full min-h-0">
        <FormHeader title="Create new ticket" onClose={handleClose} />

        <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          <div className="flex-1 space-y-4">
            <FormField label="Title">
              <input
                type="text"
                value={newTicketTitle}
                onChange={(e) => setNewTicketTitle(e.target.value)}
                className={fieldClass}
              />
            </FormField>

            <FormField label="Category">
              <select
                value={newTicketCategoryId}
                onChange={(e) =>
                  setNewTicketCategoryId(
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
            </FormField>

            <FormField label="Due Date">
              <DateInput
                value={newTicketDueDate}
                onChange={setNewTicketDueDate}
                className={fieldClass}
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={newTicketDescription}
                onChange={(e) => setNewTicketDescription(e.target.value)}
                className={`${fieldClass} min-h-24`}
              />
            </FormField>
          </div>
        </div>

        <FormFooter error={ticketSubmitError}>
          <FormButton
            color="green"
            onClick={handleCreateTicket}
            disabled={isSubmittingTicket}
          >
            {isSubmittingTicket ? "Submitting…" : "Submit"}
          </FormButton>
        </FormFooter>
      </div>
    </SlideupFrame>
  );
}
