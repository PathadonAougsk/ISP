"use client";

import type { Member } from "@/lib/account";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";

// right side panel of a form. pick members with checkbox
export default function MemberPanel({
  members,
  selectedIds,
  onChange,
  loading = false,
  error = null,
  hint,
}: {
  members: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  error?: string | null;
  hint?: string;
}) {
  const allSelected =
    members.length > 0 && selectedIds.length === members.length;

  function toggle(memberId: string) {
    onChange(
      selectedIds.includes(memberId)
        ? selectedIds.filter((id) => id !== memberId)
        : [...selectedIds, memberId],
    );
  }

  return (
    <div className="flex min-w-50 w-9/40 min-h-0 shrink-0 flex-col self-stretch rounded-[20px] bg-(--panel-bg) p-3">
      <div
        className={`flex shrink-0 items-center justify-between ${hint ? "mb-2" : "mb-3"}`}
      >
        <p className="text-base font-bold text-black">
          Members <span className="text-green-800">{members.length}</span>
        </p>
        <Button
          variant="green"
          onClick={() =>
            onChange(allSelected ? [] : members.map((member) => member.id))
          }
          disabled={members.length === 0}
          className="px-3 py-1 text-xs font-semibold"
        >
          {allSelected ? "Clear all" : "Assign all"}
        </Button>
      </div>

      {hint && <p className="mb-3 shrink-0 text-xs text-gray-500">{hint}</p>}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="text-xs text-gray-400">Loading members…</div>
        )}

        {error && !loading && (
          <div className="text-xs text-red-500">{error}</div>
        )}

        {!loading &&
          !error &&
          members.map((member) => (
            <label key={member.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(member.id)}
                onChange={() => toggle(member.id)}
                className="h-4 w-4 shrink-0 accent-(--primary-color-2)"
              />
              <Avatar name={member.name} className="h-6 w-auto shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm leading-tight font-medium text-gray-800">
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
  );
}
