"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { getTasks, type Task } from "@/components/task";
import { getTickets, type Ticket } from "@/components/ticket";
import { getUser } from "@/components/user";

const categoryMap: Record<number, string> = {
  1: "Report 1",
  2: "Report 2",
  3: "Report 3",
  4: "Report 4",
  5: "Report 5",
  6: "Report 6",
  7: "Report 7",
  8: "Report 8",
  9: "Report 9",
  10: "Report 10",
};

const ticketStatusText: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

const ticketStatusIcon: Record<string, string> = {
  pending: "/pending.svg",
  accepted: "/accepted.svg",
  rejected: "/rejected.svg",
};

const dueToday = 1;
const dueBuckets = [
  { label: "This week", count: 2, color: "bg-(--primary-red)" },
  { label: "Next week", count: 4, color: "bg-(--primary-yellow)" },
  { label: "Later", count: 3, color: "bg-(--primary-blue)" },
];

function formatDueDate(iso: string | null) {
  if (iso === null) return "No duedate";

  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear());
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

// ================================================= Page layout =================================================

function Announcement() {
  const description = "Please be informed that all classes today are canceled due to an unexpected situation. Students should not attend and may use this time for rest or personal activities.\n\ngoogle.com and www.google.com\n\nhttps://youtu.be/dQw4w9WgXcQ";
  const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s.,!?;:]*)?)/g;
  const parts = description.split(urlRegex);

  return (
    <div className="h-90 w-full overflow-hidden rounded-[30px] bg-(--panel-bg)">
      <div className="flex h-full flex-col p-5 pb-0">
        <h1 className="text-3xl font-bold text-black line-clamp-2">Test Topic Announcement 001 and show Line wrapping Test Topic Announcement 001 and show Line wrapping</h1>
        <div className="mt-2 flex items-center gap-12 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Image src="/user.svg" alt="" width={14} height={16} /><span>Pasin Mclaren</span></div>
          <div className="flex items-center gap-2"><Image src="/clock.svg" alt="" width={16} height={16} /><span>Friday 28 August 2026, 09:47</span></div>
        </div>
        <div className="mt-2 text-base font-normal text-gray-700 line-clamp-7 whitespace-pre-line">
          {parts.map((part, index) => <Fragment key={index}>{index % 2 === 1 ? <a href={part.startsWith("http") ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="italic underline hover:text-gray-500">{part}</a> : part}</Fragment>)}
        </div>
        <div className="-mx-5 mt-auto">
          <Link href="/announcement" className="group block rounded-b-[30px] bg-(--primary-color-3) px-5 py-3 text-center hover:bg-(--primary-color-3-hover)">
            <span className="text-base font-semibold text-black underline group-hover:text-gray-800">
              Readmore
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActiveTask({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex h-25 w-full gap-5">
      <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[30px] bg-(--panel-bg) p-0">
        <div className="flex flex-1 flex-col items-center justify-center gap-1"><h1 className="text-lg font-bold text-black">Due Today</h1><h1 className="text-5xl font-extrabold text-black">{dueToday}</h1></div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1"><h1 className="text-lg font-bold text-black">Active Task</h1><h1 className="text-5xl font-extrabold text-black">{tasks.length}</h1></div>
      </div>
      <div className="flex w-fit shrink-0 flex-col pr-5">
        <div className="flex items-start text-base font-bold text-black"><p>Due Tasks</p></div>
        <div className="flex flex-1">
          <div className="flex w-7.5 items-start"><div className="flex h-full w-5 flex-col overflow-hidden rounded-[20px]">{dueBuckets.map((bucket) => <div key={bucket.label} className={`w-full ${bucket.color}`} style={{ flexGrow: bucket.count }} />)}</div></div>
          <div className="flex flex-1 flex-col justify-between text-lg font-medium text-black">
            {dueBuckets.map((bucket) => <div key={bucket.label} className="flex items-center">
              <div className="flex w-7.5 items-center"><div className={`h-5 w-5 rounded-full ${bucket.color}`} /></div>
              <div className="flex w-5 items-center text-base"><p>{bucket.count}</p></div>
              <div className="flex flex-1 items-center text-base"><p>{bucket.label}</p></div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskOverview({ tasks }: { tasks: Task[] }) {
  const overviewCategories = [
    { name: "Report", chips: [{ label: "This week", count: tasks.filter((t) => t.category_id === 1).length, color: "bg-(--primary-red)" }] },
    { name: "Project", chips: [{ label: "This week", count: tasks.filter((t) => t.category_id === 2).length, color: "bg-(--primary-yellow)" }] },
  ];

  return (
    <div className="flex min-h-25 flex-1 flex-col gap-3 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
      <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <h1 className="text-base font-bold text-white">Task Overview</h1>
      </div>

      {tasks.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-4 text-center text-base font-medium text-gray-500">All tasks are done! Time to enjoy a well-earned break.</p>
      ) : (
        overviewCategories.map((category) => {
          const total = category.chips.reduce((sum, chip) => sum + chip.count, 0);
          return (
            <div key={category.name} className="flex h-15 rounded-2xl bg-white px-2 py-2">
              <div className="flex w-6 shrink-0 items-center justify-start"><Image src="/header_donut_green.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} /></div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-center gap-4">
                  <p className="shrink-0 text-base font-bold text-black">{category.name}</p>
                  <div className="flex min-w-0 items-center gap-4">
                    {category.chips.map((chip) => <div key={chip.label} className="flex items-center gap-2"><span className={`h-4 w-4 shrink-0 rounded-full ${chip.color}`} /><span className="text-base font-medium whitespace-nowrap text-black">{chip.count} {chip.label}</span></div>)}
                  </div>
                </div>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  {category.chips.map((chip) => <div key={chip.label} className={chip.color} style={{ width: `${total > 0 ? (chip.count / total) * 100 : 0}%` }} />)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TaskList({ tasks, loadingTasks }: { tasks: Task[]; loadingTasks: boolean }) {
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadUsernames() {
      const uniqueUserIds = [...new Set(tasks.map((task) => task.created_by))];

      const results = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const user = await getUser(userId);

          return {
            userId,
            username: user?.username ?? userId,
          };
        }),
      );

      setUsernames(
        Object.fromEntries(
          results.map(({ userId, username }) => [userId, username]),
        ),
      );
    }

    if (tasks.length > 0) {
      loadUsernames();
    }
  }, [tasks]);

  return (
    <div className="flex min-h-25 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image
          src="/header_arrow_down.svg"
          width={0}
          height={0}
          sizes="auto"
          className="h-4 w-auto"
          alt=""
          draggable={false}
        />

        <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Task Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Created by</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {loadingTasks ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">
          Loading tasks...
        </p>
      ) : tasks.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">
          Good job! You have completed all tasks.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex h-8 items-center gap-6 rounded-[20px] bg-white px-3"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${task.updated !== task.created
                    ? "bg-(--primary-red)"
                    : "bg-(--primary-blue)"
                  }`}
              />

              <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                <p className="truncate text-sm text-black">
                  {task.name}
                </p>

                <p className="truncate text-sm text-black">
                  {categoryMap[task.category_id]}
                </p>

                <p className="truncate text-sm text-black">
                  {usernames[task.created_by] ?? "-"}
                </p>

                <p className="text-sm text-black">
                  {formatDueDate(task.due_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketList({ tickets, loadingTickets }: { tickets: Ticket[]; loadingTickets: boolean }) {
  return (
    <div className="flex min-h-25 flex-1 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Ticket Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Status</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {loadingTickets ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">"Looks like everything's pretty peaceful around here. Hell yeah!"</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((ticket) => {
            const isAccepted = ticket.status === "accepted";

            return (
              <div key={ticket.id} className={`flex h-8 items-center gap-4 rounded-[20px] px-2 ${isAccepted ? "bg-gray-100" : "bg-white"}`}>
                <Image src={ticketStatusIcon[ticket.status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={ticket.status} draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_1.4fr] items-center gap-2">
                  <p className={`truncate text-sm ${isAccepted ? "text-gray-400" : "text-black"}`}>{ticket.name}</p>
                  <p className={`truncate text-sm ${isAccepted ? "text-gray-400" : "text-black"}`}>{categoryMap[ticket.category_id]}</p>
                  <p className={`truncate text-sm ${isAccepted ? "text-gray-400" : "text-black"}`}>{ticketStatusText[ticket.status]}</p>
                  <p className={`text-sm ${isAccepted ? "text-gray-400" : "text-black"}`}>{formatDueDate(ticket.due_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskTicketList({ tasks, loadingTasks, tickets, loadingTickets }: { tasks: Task[]; loadingTasks: boolean; tickets: Ticket[]; loadingTickets: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 shrink-0">
      <div className="flex h-full w-full flex-col gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
        <TaskList tasks={tasks} loadingTasks={loadingTasks} />
        <TicketList tickets={tickets} loadingTickets={loadingTickets} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // get task
  useEffect(() => {
    getTasks()
      .then(({ Tasks }) => setTasks(Tasks))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, []);

  // get ticket
  useEffect(() => {
    getTickets({ onlyOwned: true })
      .then(({ Tickets }) => setTickets(Tickets))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, []);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-100 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
        <ActiveTask tasks={tasks} />
        <TaskOverview tasks={tasks} />
      </div>

      <TaskTicketList tasks={tasks} loadingTasks={loadingTasks} tickets={tickets} loadingTickets={loadingTickets} />
    </main>
  );
}
