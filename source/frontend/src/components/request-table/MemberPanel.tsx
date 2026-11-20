"use client";

import type { Member } from "@/lib/account";
import { useCurrentAccount } from "@/lib/account";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";

// right side panel of a form. pick members with checkbox
export default function MemberPanel({
  members = [],
  selectedIds,
  onChange,
  loading = false,
  error = null,
  hint,
  readOnly = false,
  title = "Assignees",
  className,
}: {
  members?: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  error?: string | null;
  hint?: string;
  readOnly?: boolean;
  title?: string;
  className?: string;
}) {
  const { currentUserId } = useCurrentAccount();

  // inactive can't be picked. one already picked stay shown, so it can be
  // removed. read only = just a list, show everyone
  const activeMembers = members.filter((member) => member.active);
  const shownMembers = readOnly
    ? members
    : members.filter(
        (member) => member.active || selectedIds.includes(member.id),
      );

  const allSelected =
    activeMembers.length > 0 &&
    activeMembers.every((member) => selectedIds.includes(member.id));

  function toggle(memberId: string) {
    onChange(
      selectedIds.includes(memberId)
        ? selectedIds.filter((id) => id !== memberId)
        : [...selectedIds, memberId],
    );
  }

  const sortedMembers = [...shownMembers].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return (
    <div
      className={`flex min-h-0 flex-col self-stretch rounded-[20px] bg-(--panel-bg) p-3 ${className ?? "min-w-50 w-1/4 shrink-0"}`}
    >
      <div
        className={`flex shrink-0 items-center justify-between ${hint ? "mb-2" : "mb-3"}`}
      >
        <p className="text-base font-bold text-black">
          <span>{title}</span>
          {!readOnly && (
            <span className="ml-2 text-green-800">
              {selectedIds.length} / {activeMembers.length}
            </span>
          )}
        </p>
        {!readOnly && (
          <Button
            variant="green"
            onClick={() =>
              onChange(
                allSelected ? [] : activeMembers.map((member) => member.id),
              )
            }
            disabled={activeMembers.length === 0}
            className="px-3 py-1 text-xs font-semibold"
          >
            {allSelected ? "Clear all" : "Assign all"}
          </Button>
        )}
      </div>

      {hint && <p className="mb-3 shrink-0 text-xs text-gray-500">{hint}</p>}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-2">
        {loading && (
          <div className="text-xs text-gray-400">Loading members…</div>
        )}

        {error && !loading && (
          <div className="text-xs text-red-500">{error}</div>
        )}

        {!loading &&
          !error &&
          sortedMembers.map((member) => (
            <label key={member.id} className="flex items-center gap-2">
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => toggle(member.id)}
                  className="size-4 shrink-0 accent-(--primary-color-2)"
                />
              )}
              <Avatar name={member.name} className="h-6 w-auto shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center text-sm leading-tight font-medium">
                  <span className="truncate text-gray-800" title={member.name}>
                    {member.name}
                  </span>
                  {member.id === currentUserId && (
                    <span className="ml-1 shrink-0 text-gray-500">(You)</span>
                  )}
                  {!member.active && (
                    <span className="ml-1 shrink-0 text-gray-500">
                      (inactive)
                    </span>
                  )}
                </div>
                <div
                  className="truncate text-xs leading-tight text-gray-500"
                  title={member.email}
                >
                  {member.email}
                </div>
              </div>
            </label>
          ))}
      </div>
    </div>
  );
}
