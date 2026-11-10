"use client";

import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import {
  FormButton,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import { SlideupDescription } from "@/components/dashboard/dashboard-utils";

export default function DeleteAnnouncementModal({
  announcement,
  authorName,
  onClose,
  onConfirm,
}: {
  announcement: Announcement;
  authorName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { saving, error, run } = useFormSubmit();

  async function handleDelete(close: () => void) {
    const ok = await run(onConfirm, "Something went wrong.");

    if (ok) close();
  }

  return (
    <FormModal
      title="Delete this announcement?"
      onClose={onClose}
      error={error}
      footer={(close) => (
        <>
          <FormButton variant="green" onClick={close} disabled={saving}>
            Cancel
          </FormButton>
          <FormButton
            variant="red"
            onClick={() => handleDelete(close)}
            disabled={saving}
          >
            {saving ? "Deleting…" : "Delete"}
          </FormButton>
        </>
      )}
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold wrap-break-word">
          {renderWithLinks(announcement.name)}
        </h2>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <Icon src="/user.svg" className="h-auto w-4 shrink-0" />
            {authorName}
          </span>

          <span className="flex items-center gap-2">
            <Icon src="/clock.svg" className="h-auto w-4 shrink-0" />
            {formatFullDateTime(announcement.created)}
          </span>
        </div>

        <SlideupDescription description={announcement.description} />
      </div>
    </FormModal>
  );
}
