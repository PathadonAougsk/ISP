"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccounts, type Account, type AccountRole } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks, type GetTasksParams, type Task } from "@/lib/task";
import { getTickets, type Ticket } from "@/lib/ticket";
import { formatCount, getRoom } from "@/components/dashboard/dashboard_status";

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

// loading + error flag, one pair for each request group
type Resource =
  | "categories"
  | "myTasks"
  | "otherTasks"
  | "myTickets"
  | "otherTickets";
type Flags = { loading: boolean; error: boolean };
type SetFlag = (key: Resource, patch: Partial<Flags>) => void;

const initialFlags: Record<Resource, Flags> = {
  categories: { loading: true, error: false },
  myTasks: { loading: true, error: false },
  otherTasks: { loading: true, error: false },
  myTickets: { loading: true, error: false },
  otherTickets: { loading: true, error: false },
};

// categories dont need an account
const accountResources = (Object.keys(initialFlags) as Resource[]).filter(
  (key) => key !== "categories",
);

// same flow for every group. cancelled = ignore everything
async function runLoad(
  key: Resource,
  setFlag: SetFlag,
  isCancelled: () => boolean,
  load: () => Promise<void>,
  reset: () => void,
) {
  try {
    await load();

    if (isCancelled()) return;

    setFlag(key, { error: false });
  } catch {
    if (isCancelled()) return;

    reset();
    setFlag(key, { error: true });
  } finally {
    if (!isCancelled()) setFlag(key, { loading: false });
  }
}

export function useDashboardFetching(
  currentAccount: Account | null,
  accountLoading: boolean,
  maxTask: number,
  maxTicket: number,
) {
  const accountId = currentAccount?.id;
  const accountRole = currentAccount?.role;

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [myRejectedTickets, setMyRejectedTickets] = useState<Ticket[]>([]);
  const [myPendingTickets, setMyPendingTickets] = useState<Ticket[]>([]);
  const [otherRejectedTickets, setOtherRejectedTickets] = useState<Ticket[]>(
    [],
  );
  const [otherPendingTickets, setOtherPendingTickets] = useState<Ticket[]>([]);

  const [flags, setFlags] = useState(initialFlags);

  // patch one group only, other groups stay same
  const setFlag = useCallback<SetFlag>((key, patch) => {
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  // bump to refetch tasks, loading flags stay false so no flicker
  const [tasksReloadKey, setTasksReloadKey] = useState(0);
  // same for tickets, tasks are not touched
  const [ticketsReloadKey, setTicketsReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    runLoad(
      "categories",
      setFlag,
      () => cancelled,
      async () => {
        const { Categories } = await getCategories();

        if (!cancelled) setCategories(Categories);
      },
      () => setCategories([]),
    );

    return () => {
      cancelled = true;
    };
  }, [setFlag]);

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

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    async function loadTasks(
      params: GetTasksParams,
      key: Resource,
      setTasks: (tasks: Task[]) => void,
    ): Promise<Task[]> {
      let loaded: Task[] = [];

      await runLoad(
        key,
        setFlag,
        () => cancelled,
        async () => {
          const { Tasks } = await getTasks(params);

          if (cancelled) return;

          loaded = sortByDueDate(Tasks);
          setTasks(loaded);
        },
        () => setTasks([]),
      );

      return loaded;
    }

    // load as sequence and with only needed amount
    // limit = max + 1 - already loaded
    async function loadAllTasks(userId: string) {
      const mine = await loadTasks(
        {
          status: "in_progress",
          assignsTo: userId,
          limit: maxTask + 1,
        },
        "myTasks",
        setMyTasks,
      );

      // lab user cant see others' tasks
      if (cancelled || accountRole === "Lab User") return;

      // my tasks already over the max, skip the request
      if (mine.length > maxTask) {
        setFlag("otherTasks", { loading: false });
        return;
      }

      // load others' task, backend skips the ones assigned to me
      await loadTasks(
        {
          status: "in_progress",
          notassignsTo: userId,
          limit: maxTask + 1 - mine.length,
        },
        "otherTasks",
        setOtherTasks,
      );
    }

    setFlag("otherTasks", { error: false });
    loadAllTasks(accountId);

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTask, tasksReloadKey, setFlag]);

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    // my rejected -> my pending -> others' rejected -> others' pending
    // limit = max + 1
    async function loadTickets() {
      let rejectedCount = 0;
      let myPending: Ticket[] = [];

      await runLoad(
        "myTickets",
        setFlag,
        () => cancelled,
        async () => {
          const { Tickets: rejected } = await getTickets({
            status: "rejected",
            onlyOwned: true,
            limit: maxTicket + 1,
          });

          if (cancelled) return;

          rejectedCount = rejected.length;
          setMyRejectedTickets(sortByDueDate(rejected));

          // always load pending (for ticket overview)
          const { Tickets: pending } = await getTickets({
            status: "pending",
            onlyOwned: true,
            limit: maxTicket + 1,
          });

          if (cancelled) return;

          myPending = sortByDueDate(pending);
          setMyPendingTickets(myPending);
        },
        () => {
          rejectedCount = 0;
          myPending = [];
          setMyRejectedTickets([]);
          setMyPendingTickets([]);
        },
      );

      // lab user cant see others' tickets
      if (cancelled || accountRole === "Lab User") return;

      const room = getRoom(maxTicket + 1, rejectedCount, myPending.length);

      // my tickets already over the max, skip the request
      if (room <= 0) {
        setFlag("otherTickets", { loading: false });
        return;
      }

      await runLoad(
        "otherTickets",
        setFlag,
        () => cancelled,
        async () => {
          // others' rejected first, room already > 0 here
          const { Tickets: otherRejected } = await getTickets({
            status: "rejected",
            notOwned: true,
            limit: maxTicket + 1 - rejectedCount,
          });

          if (cancelled) return;

          const rejectedShown = sortByDueDate(otherRejected).slice(0, room);
          setOtherRejectedTickets(rejectedShown);

          const pendingRoom = getRoom(room, rejectedShown.length);

          // others' rejected fill the room, skip the request
          if (pendingRoom > 0) {
            const { Tickets: otherPending } = await getTickets({
              status: "pending",
              notOwned: true,
              limit: maxTicket + 1 - myPending.length,
            });

            if (cancelled) return;

            setOtherPendingTickets(
              sortByDueDate(otherPending).slice(0, pendingRoom),
            );
          } else {
            setOtherPendingTickets([]);
          }
        },
        () => {
          setOtherRejectedTickets([]);
          setOtherPendingTickets([]);
        },
      );
    }

    setFlag("otherTickets", { error: false });
    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTicket, ticketsReloadKey, setFlag]);

  useEffect(() => {
    if (accountLoading || currentAccount !== null) return;

    accountResources.forEach((key) =>
      setFlag(key, { loading: false, error: true }),
    );
  }, [accountLoading, currentAccount, setFlag]);

  // id -> name / role, built from all accounts
  const usernames = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((account): [string, string] => [
          account.id,
          account.username,
        ]),
      ),
    [accounts],
  );

  const creatorRoles = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((account): [string, AccountRole] => [
          account.id,
          account.role,
        ]),
      ),
    [accounts],
  );

  const loadingMyTasks = flags.myTasks.loading;

  // keep one extra item, so count can show max+
  const visibleOtherTasks = useMemo(() => {
    if (loadingMyTasks) return [];

    return otherTasks.slice(0, getRoom(maxTask + 1, myTasks.length));
  }, [loadingMyTasks, maxTask, myTasks.length, otherTasks]);

  // lists show max only, the extra item is just for count
  const shownMyTasks = useMemo(
    () => myTasks.slice(0, maxTask),
    [maxTask, myTasks],
  );

  const otherTaskRoom = getRoom(maxTask, myTasks.length);

  const shownOtherTasks = useMemo(
    () => visibleOtherTasks.slice(0, otherTaskRoom),
    [otherTaskRoom, visibleOtherTasks],
  );

  const shownMyRejectedTickets = useMemo(
    () => myRejectedTickets.slice(0, maxTicket),
    [maxTicket, myRejectedTickets],
  );

  const shownMyPendingTickets = useMemo(
    () => myPendingTickets.slice(0, maxTicket),
    [maxTicket, myPendingTickets],
  );

  // others only fill the room that mine leave
  const ticketRoom = getRoom(
    maxTicket,
    shownMyRejectedTickets.length,
    shownMyPendingTickets.length,
  );

  const shownOtherRejectedTickets = useMemo(
    () => otherRejectedTickets.slice(0, ticketRoom),
    [otherRejectedTickets, ticketRoom],
  );

  const pendingRoom = getRoom(ticketRoom, shownOtherRejectedTickets.length);

  const shownOtherPendingTickets = useMemo(
    () => otherPendingTickets.slice(0, pendingRoom),
    [otherPendingTickets, pendingRoom],
  );

  // label counting
  const taskCounts = {
    myTasks: formatCount(myTasks.length, maxTask),
    otherTasks: formatCount(visibleOtherTasks.length, otherTaskRoom),
  };

  const ticketCounts = {
    myRejectedTickets: formatCount(myRejectedTickets.length, maxTicket),
    myPendingTickets: formatCount(myPendingTickets.length, maxTicket),
    otherRejectedTickets: formatCount(otherRejectedTickets.length, ticketRoom),
    otherPendingTickets: formatCount(otherPendingTickets.length, pendingRoom),
  };

  return {
    // full lists (with the extra item), only for Missing
    myTasks,
    myRejectedTickets,
    myPendingTickets,
    // lists for the UI, already cut to max
    shownMyTasks,
    shownOtherTasks,
    shownMyRejectedTickets,
    shownMyPendingTickets,
    shownOtherRejectedTickets,
    shownOtherPendingTickets,
    taskCounts,
    ticketCounts,
    categories,
    usernames,
    creatorRoles,
    loadingMyTasks,
    // others wait for my tasks, so the list never jump around
    loadingOtherTasks:
      flags.otherTasks.loading &&
      accountRole !== "Lab User" &&
      (loadingMyTasks || myTasks.length <= maxTask),
    loadingCategories: flags.categories.loading,
    loadingMyTickets: flags.myTickets.loading,
    loadingOtherTickets:
      flags.otherTickets.loading && accountRole !== "Lab User",
    errorMyTasks: flags.myTasks.error,
    errorOtherTasks: flags.otherTasks.error,
    errorCategories: flags.categories.error,
    errorMyTickets: flags.myTickets.error,
    errorOtherTickets: flags.otherTickets.error,
    reloadTasks: () => setTasksReloadKey((key) => key + 1),
    reloadTickets: () => setTicketsReloadKey((key) => key + 1),
  };
}
