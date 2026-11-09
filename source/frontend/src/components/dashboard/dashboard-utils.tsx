"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatFullDateTime } from "@/lib/format";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import {
  isMissingItem,
  type DashboardView,
} from "@/components/dashboard/dashboard-data";

// The pieces a task or ticket slideup is built from.

// black button, go to request-table. label is different per caller
export function RequestTableButton({
  type,
  id,
  label,
}: {
  type: DashboardView;
  id: number;
  label: string;
}) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  return (
    <Button
      variant="dark"
      onClick={() => {
        setRedirecting(true);
        router.push(`/request-table/${type}/${id}`);
      }}
      disabled={redirecting}
      className="h-7.5 w-50 px-4 text-sm font-semibold"
    >
      {label}
    </Button>
  );
}

// id + category + created date row. children are extra items added at the end
export function SlideupMeta({
  categoryName,
  createdDate,
  children,
}: {
  categoryName: string;
  createdDate: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <Icon src="/header_donut_gray.svg" />
        <span>{categoryName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon src="/clock.svg" />
        <span>{formatFullDateTime(createdDate, "created")}</span>
      </div>
      {children}
    </div>
  );
}

// shows nothing when the item was never edited
// updated within 500ms of created = same save, not an edit
export function SlideupEdited({
  created,
  updated,
}: {
  created: string | null;
  updated: string | null;
}) {
  if (
    created === null ||
    updated === null ||
    Math.abs(new Date(updated).getTime() - new Date(created).getTime()) <= 500
  ) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
      <span className="font-semibold italic">Edited</span>
      <span>{formatFullDateTime(updated)}</span>
    </div>
  );
}

// red error text for a slideup action. className is for the position
export function SlideupError({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`text-sm font-semibold text-red-700 ${className}`}
    >
      {message}
    </p>
  );
}

// due date + red missing badge in one row
// badge show only when task in_progress or ticket pending/rejected is past due
export function SlideupDueRow({
  type,
  status,
  dueDate,
}: {
  type: DashboardView;
  status: string;
  dueDate: string | null;
}) {
  const missing = isMissingItem(
    { status, due_date: dueDate },
    type === "task" ? ["in_progress"] : ["pending", "rejected"],
    new Date(),
  );

  return (
    <div className="flex items-end gap-8">
      <div className="mt-2 flex items-center gap-2 text-base font-semibold text-black">
        {dueDate === null ? (
          <span>{formatFullDateTime(dueDate)}</span>
        ) : (
          <>
            <span>Due</span>
            <span>{formatFullDateTime(dueDate)}</span>
          </>
        )}
      </div>

      {missing && (
        <div className="flex h-6 items-center rounded-[20px] bg-(--primary-red) px-3 text-sm font-bold text-white">
          Missing
        </div>
      )}
    </div>
  );
}

// scrollable description with clickable links
export function SlideupDescription({
  description,
}: {
  description: string | null;
}) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="mb-4 border-t border-gray-300" />
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-5 pb-25 whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
        {description ? (
          renderWithLinks(description)
        ) : (
          <span className="text-gray-400">No description</span>
        )}
      </div>
    </div>
  );
}
