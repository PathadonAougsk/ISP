"use client";
import { useState } from "react";
import { postTicket } from "@/lib/ticket";
import type { Category } from "@/lib/category";

export default function CreateTicketModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
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
    onClose();
  }

  return (
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
                onChange={(e) =>
                  setNewTicketCategoryId(
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
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
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
            <span className="text-sm text-red-500 mr-auto">
              {ticketSubmitError}
            </span>
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
  );
}
