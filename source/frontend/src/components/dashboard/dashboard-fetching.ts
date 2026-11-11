"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccounts, type Account, type AccountRole } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks } from "@/lib/task";
import { getTickets } from "@/lib/ticket";
import {
  formatCount,
  type DashboardItem,
  type GroupState,
} from "@/components/dashboard/dashboard-data";

// limit of each list at first load
const INITIAL_LIMIT = 10;

// limit increment when clicking Load More button
const INCREMENT = 10;

// loading + error flag of one request
// refreshing = any fetch running. only for disable Load More, never show loading text
type Flags = { loading: boolean; error: boolean; refreshing: boolean };

const LOADING: Flags = { loading: true, error: false, refreshing: false };
const DONE: Flags = { loading: false, error: false, refreshing: false };

// due date asc, null last. both null or same date, sort by id asc
function sortByDueDate<T extends { id: number; due_date: string | null }>(
  items: T[],
) {
  return [...items].sort((a, b) => {
    if (a.due_date === null && b.due_date === null) return a.id - b.id;
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;

    const diff =
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });
}

// What the signed in account looks like to a group: no id yet means we are
// either still waiting for it, or it never arrived.
type AccountState = {
  id: string | undefined;
  loading: boolean;
  error: boolean;
};

// One list in the dashboard. Fetches limit + 1, where the extra item only says
// the list has more. The group owns its limit, so a failed Load More leaves the
// old items and the old limit alone.
function useGroup<T extends DashboardItem & { id: number }>(
  account: AccountState,
  enabled: boolean,
  reloadKey: number,
  fetchItems: (accountId: string, limit: number) => Promise<T[]>,
): GroupState<T> {
  // keep the limit that items were fetched with, so old page stay right while refetch
  const [data, setData] = useState<{ items: T[]; limit: number }>({
    items: [],
    limit: INITIAL_LIMIT,
  });
  const [flags, setFlags] = useState<Flags>(LOADING);

  // latest fetcher and committed limit, so effect deps stay short
  const fetchRef = useRef(fetchItems);
  const limitRef = useRef(data.limit);
  // every load bump this. older load see the change and get ignored
  const requestRef = useRef(0);

  useEffect(() => {
    fetchRef.current = fetchItems;
  });

  // only the newest request can commit. failed one never touch old data
  const load = useCallback(async (accountId: string, limit: number) => {
    const requestId = ++requestRef.current;
    const isStale = () => requestRef.current !== requestId;

    setFlags((prev) => ({ ...prev, refreshing: true }));

    try {
      const items = await fetchRef.current(accountId, limit + 1);
      if (isStale()) return;

      limitRef.current = limit;
      setData({ items: sortByDueDate(items), limit });
      setFlags(DONE);
    } catch {
      // keep whatever is on screen, just say the refresh failed
      if (!isStale()) {
        setFlags({ loading: false, error: true, refreshing: false });
      }
    }
  }, []);

  // new account or role = start over
  useEffect(() => {
    setData((prev) => ({ items: [], limit: prev.limit }));
    setFlags((prev) => ({ ...prev, loading: true, error: false }));
  }, [account.id, enabled]);

  useEffect(() => {
    // signed out, or the account request itself failed: nothing to wait for
    if (account.id === undefined) {
      if (!account.loading) setFlags({ ...DONE, error: account.error });
      return;
    }

    // not allowed (lab user), skip the request
    if (!enabled) {
      setFlags(DONE);
      return;
    }

    void load(account.id, limitRef.current);

    return () => {
      requestRef.current += 1;
    };
  }, [account.id, account.loading, account.error, enabled, reloadKey, load]);

  const loadMore = useCallback(() => {
    if (account.id !== undefined) {
      void load(account.id, limitRef.current + INCREMENT);
    }
  }, [account.id, load]);

  const items = useMemo(
    () => data.items.slice(0, data.limit),
    [data.items, data.limit],
  );

  return {
    items,
    all: data.items,
    overflow: data.items[data.limit] ?? null,
    count: formatCount(data.items.length, data.limit),
    loading: flags.loading,
    error: flags.error,
    refreshing: flags.refreshing,
    loadMore,
  };
}

export function useDashboardFetching(
  currentAccount: Account | null,
  accountLoading: boolean,
  accountError: string | null,
) {
  // lab user cant see others' items
  const canSeeOthers = currentAccount?.role !== "Lab User";

  const account: AccountState = {
    id: currentAccount?.id,
    loading: accountLoading,
    error: accountError !== null,
  };

  const [accounts, setAccounts] = useState<Account[]>([]);

  // bump to refetch tasks, loading flags stay false so no flicker
  const [tasksReloadKey, setTasksReloadKey] = useState(0);
  // same for tickets, tasks are not touched
  const [ticketsReloadKey, setTicketsReloadKey] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryState, setCategoryState] = useState({
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then(({ Categories }) => {
        if (!cancelled) {
          setCategories(Categories);
          setCategoryState({ loading: false, error: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setCategoryState({ loading: false, error: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // fail = names show "-", nothing else break
    getAccounts()
      .then(({ Accounts }) => {
        if (!cancelled) setAccounts(Accounts);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // fetch all at the same time, no more sequential
  const groups = {
    myTasks: useGroup(
      account,
      true,
      tasksReloadKey,
      async (id, limit) =>
        (await getTasks({ status: "in_progress", assignsTo: id, limit })).Tasks,
    ),

    otherTasks: useGroup(
      account,
      canSeeOthers,
      tasksReloadKey,
      async (id, limit) =>
        (await getTasks({ status: "in_progress", notassignsTo: id, limit }))
          .Tasks,
    ),

    myRejectedTickets: useGroup(
      account,
      true,
      ticketsReloadKey,
      async (_id, limit) =>
        (await getTickets({ status: "rejected", onlyOwned: true, limit }))
          .Tickets,
    ),

    myPendingTickets: useGroup(
      account,
      true,
      ticketsReloadKey,
      async (_id, limit) =>
        (await getTickets({ status: "pending", onlyOwned: true, limit }))
          .Tickets,
    ),

    otherRejectedTickets: useGroup(
      account,
      canSeeOthers,
      ticketsReloadKey,
      async (_id, limit) =>
        (await getTickets({ status: "rejected", notOwned: true, limit }))
          .Tickets,
    ),

    otherPendingTickets: useGroup(
      account,
      canSeeOthers,
      ticketsReloadKey,
      async (_id, limit) =>
        (await getTickets({ status: "pending", notOwned: true, limit }))
          .Tickets,
    ),
  };

  // id -> name / role, built from all accounts
  const usernames = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((item): [string, string] => [item.id, item.username]),
      ),
    [accounts],
  );

  const creatorRoles = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((item): [string, AccountRole] => [item.id, item.role]),
      ),
    [accounts],
  );

  return {
    // the six lists, each with items, count, flags and loadMore
    groups,
    categories,
    usernames,
    creatorRoles,
    loadingCategories: categoryState.loading,
    errorCategories: categoryState.error,
    reloadTasks: () => setTasksReloadKey((key) => key + 1),
    reloadTickets: () => setTicketsReloadKey((key) => key + 1),
  };
}

export type DashboardGroups = ReturnType<typeof useDashboardFetching>["groups"];
