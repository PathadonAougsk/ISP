"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAccounts,
  onAccountChange,
  type Account,
  type AccountRole,
} from "@/lib/account";
import {
  getCategories,
  onCategoryChange,
  type Category,
} from "@/lib/category";
import { getTasks, onTaskChange } from "@/lib/task";
import { getTickets, onTicketChange } from "@/lib/ticket";
import {
  type DashboardItem,
  type GroupState,
} from "@/components/dashboard/dashboard-data";

// limit of each list at first load
const INITIAL_LIMIT = 10;

// limit increment when clicking Load More button
const INCREMENT = 10;

// backend default is 100, so ask for 100 on purpose
const FETCH_LIMIT = 100;

// loading + error flag of one request
type Flags = { loading: boolean; error: boolean };

const LOADING: Flags = { loading: true, error: false };
const DONE: Flags = { loading: false, error: false };

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

// One list in the dashboard. Fetches everything once. The group owns how many
// items are visible (limit), and Load More only raises it, no new request.
function useGroup<T extends DashboardItem & { id: number }>(
  account: AccountState,
  enabled: boolean,
  reloadKey: number,
  fetchItems: (accountId: string) => Promise<T[]>,
): GroupState<T> {
  const [all, setAll] = useState<T[]>([]);
  // how many items are visible, Load More only raise this
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [flags, setFlags] = useState<Flags>(LOADING);

  // latest fetcher, so effect deps stay short
  const fetchRef = useRef(fetchItems);
  // every load bump this. older load see the change and get ignored
  const requestRef = useRef(0);

  useEffect(() => {
    fetchRef.current = fetchItems;
  });

  // only the newest request can commit. failed one never touch old data
  const load = useCallback(async (accountId: string) => {
    const requestId = ++requestRef.current;
    const isStale = () => requestRef.current !== requestId;

    try {
      const items = await fetchRef.current(accountId);
      if (isStale()) return;

      setAll(sortByDueDate(items));
      setFlags(DONE);
    } catch {
      // keep whatever is on screen, just say the refresh failed
      if (!isStale()) {
        setFlags({ loading: false, error: true });
      }
    }
  }, []);

  // new account or role = start over
  const key = `${account.id}|${enabled}`;
  const [prevKey, setPrevKey] = useState(key);

  if (prevKey !== key) {
    setPrevKey(key);
    setAll([]);
    setFlags(LOADING);
  }

  useEffect(() => {
    // signed out or not allowed (lab user): nothing to fetch
    if (account.id === undefined || !enabled) return;

    void load(account.id);

    return () => {
      requestRef.current += 1;
    };
  }, [account.id, enabled, reloadKey, load]);

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + INCREMENT);
  }, []);

  const items = useMemo(() => all.slice(0, limit), [all, limit]);

  // nothing to wait for: signed out, account failed, or not allowed
  let shown = flags;
  if (account.id === undefined) {
    if (!account.loading) shown = { ...DONE, error: account.error };
  } else if (!enabled) {
    shown = DONE;
  }

  return {
    items,
    all,
    loading: shown.loading,
    error: shown.error,
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

  // bump when settings change categories / accounts, so names refetch
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [accountsKey, setAccountsKey] = useState(0);

  useEffect(
    () => onCategoryChange(() => setCategoriesKey((key) => key + 1)),
    [],
  );
  useEffect(
    () => onAccountChange(() => setAccountsKey((key) => key + 1)),
    [],
  );
  useEffect(
    () => onTaskChange(() => setTasksReloadKey((key) => key + 1)),
    [],
  );
  useEffect(
    () => onTicketChange(() => setTicketsReloadKey((key) => key + 1)),
    [],
  );

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
  }, [categoriesKey]);

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
  }, [accountsKey]);

  // fetch all at the same time, no more sequential
  const groups = {
    myTasks: useGroup(
      account,
      true,
      tasksReloadKey,
      async (id) =>
        (
          await getTasks({
            status: "in_progress",
            assignsTo: id,
            limit: FETCH_LIMIT,
          })
        ).Tasks,
    ),

    otherTasks: useGroup(
      account,
      canSeeOthers,
      tasksReloadKey,
      async (id) =>
        (
          await getTasks({
            status: "in_progress",
            notassignsTo: id,
            limit: FETCH_LIMIT,
          })
        ).Tasks,
    ),

    myRejectedTickets: useGroup(
      account,
      true,
      ticketsReloadKey,
      async () =>
        (
          await getTickets({
            status: "rejected",
            onlyOwned: true,
            limit: FETCH_LIMIT,
          })
        ).Tickets,
    ),

    myPendingTickets: useGroup(
      account,
      true,
      ticketsReloadKey,
      async () =>
        (
          await getTickets({
            status: "pending",
            onlyOwned: true,
            limit: FETCH_LIMIT,
          })
        ).Tickets,
    ),

    otherRejectedTickets: useGroup(
      account,
      canSeeOthers,
      ticketsReloadKey,
      async () =>
        (
          await getTickets({
            status: "rejected",
            notOwned: true,
            limit: FETCH_LIMIT,
          })
        ).Tickets,
    ),

    otherPendingTickets: useGroup(
      account,
      canSeeOthers,
      ticketsReloadKey,
      async () =>
        (
          await getTickets({
            status: "pending",
            notOwned: true,
            limit: FETCH_LIMIT,
          })
        ).Tickets,
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
  };
}

export type DashboardGroups = ReturnType<typeof useDashboardFetching>["groups"];
