"use client";

import { useEffect, useState } from "react";
import { getAccounts, mapAccountToMember, type Member } from "@/lib/account";

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const { Accounts } = await getAccounts();

        if (!cancelled) {
          setMembers(Accounts.map(mapAccountToMember));
          setMembersError(null);
        }
      } catch (err) {
        if (!cancelled)
          setMembersError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  return { members, membersLoading, membersError };
}
