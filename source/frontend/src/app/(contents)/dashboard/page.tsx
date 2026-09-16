import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

const categoryMap: Record<number, string> = { 1: "Report", 2: "Project" };
const ticketStatusMap: Record<number, string> = { 1: "Pending", 2: "In Progress", 3: "Approved", 4: "Rejected", 5: "Complete" };
const ticketStatusIcon: Record<string, string> = {
  Pending: "/pending.svg", "In Progress": "/in_progress.svg", Approved: "/approved.svg", Rejected: "/rejected.svg", Complete: "/header_donut_gray.svg",
};

type DummyTask = {
  id: number; name: string; status: string; created_by: string; created: string; completed_at: string | null; description: string;
  category_id: number; completed_by: string | null; updated: string; due_date: string; highlight?: boolean;
};

// const dummyTasks: DummyTask[] = [];

const dummyTasks: DummyTask[] = [
  { id: 1, name: "Report_Task01", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-20T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-20T09:00:00+00:00", due_date: "2026-08-31T12:00:00+00:00", highlight: true },
  { id: 2, name: "Project_Task01", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-22T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-22T09:00:00+00:00", due_date: "2026-09-02T10:00:00+00:00", highlight: true },
  { id: 3, name: "Report_Task02", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 4, name: "Report_Task03", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 5, name: "Report_Task04", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 6, name: "Report_Task05", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 7, name: "Project_Task02", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-28T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-28T09:00:00+00:00", due_date: "2026-09-13T23:59:00+00:00" },
  { id: 8, name: "Project_Task03", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-28T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-28T09:00:00+00:00", due_date: "2026-09-13T23:59:00+00:00" },
  { id: 9, name: "Project_Task04", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-28T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-28T09:00:00+00:00", due_date: "2026-09-13T23:59:00+00:00" },
];

type DummyTicket = {
  id: number; name: string; description: string; category_id: number; completed_by: string | null; created: string;
  completed_at: string | null; status_id: number; created_by: string; assigned_id: string | null; updated: string; due_date: string;
};

// const dummyTickets: DummyTicket[] = [];

const dummyTickets: DummyTicket[] = [
  { id: 1, name: "Cannot upload experiment results", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 4, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T13:00:00+00:00" },
  { id: 2, name: "Cannot upload experiment results", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 3, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T12:00:00+00:00" },
  { id: 3, name: "Cannot upload experiment results", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 2, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T12:00:00+00:00" },
  { id: 4, name: "Cannot upload files in task 001", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 1, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T14:00:00+00:00" },
  { id: 5, name: "Cannot upload files in task 002", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 5, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T11:00:00+00:00" },
];

const dueToday = 1;
const dueBuckets = [
  { label: "This week", count: 2, color: "bg-(--primary-red)" },
  { label: "Next week", count: 4, color: "bg-(--primary-yellow)" },
  { label: "Later", count: 3, color: "bg-(--primary-blue)" },
];

const overviewCategories = [
  {
    name: "Report", chips: [
      { label: "This week", count: 1, color: "bg-(--primary-red)" },
      { label: "Next week", count: 4, color: "bg-(--primary-yellow)" },
    ]
  },
  {
    name: "Project", chips: [
      { label: "This week", count: 1, color: "bg-(--primary-red)" },
      { label: "Later", count: 3, color: "bg-(--primary-blue)" },
    ]
  },
];

function formatDueDate(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear()).slice(-2);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

// ================================================= Page layout =================================================

import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

const categoryMap: Record<number, string> = { 1: "Report", 2: "Project" };
const ticketStatusMap: Record<number, string> = { 1: "Pending", 2: "In Progress", 3: "Approved", 4: "Rejected", 5: "Complete" };
const ticketStatusIcon: Record<string, string> = {
  Pending: "/pending.svg", "In Progress": "/in_progress.svg", Approved: "/approved.svg", Rejected: "/rejected.svg", Complete: "/header_donut_gray.svg",
};

type DummyTask = {
  id: number; name: string; status: string; created_by: string; created: string; completed_at: string | null; description: string;
  category_id: number; completed_by: string | null; updated: string; due_date: string; highlight?: boolean;
};

// const dummyTasks: DummyTask[] = [];

const dummyTasks: DummyTask[] = [
  { id: 1, name: "Report_Task01", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-20T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-20T09:00:00+00:00", due_date: "2026-08-31T12:00:00+00:00", highlight: true },
  { id: 2, name: "Project_Task01", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-22T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-22T09:00:00+00:00", due_date: "2026-09-02T10:00:00+00:00", highlight: true },
  { id: 3, name: "Report_Task02", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 4, name: "Report_Task03", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 5, name: "Report_Task04", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 6, name: "Report_Task05", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-25T09:00:00+00:00", completed_at: null, description: "", category_id: 1, completed_by: null, updated: "2026-08-25T09:00:00+00:00", due_date: "2026-09-09T23:59:00+00:00" },
  { id: 7, name: "Project_Task02", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-28T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-28T09:00:00+00:00", due_date: "2026-09-13T23:59:00+00:00" },
  { id: 8, name: "Project_Task03", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-28T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-28T09:00:00+00:00", due_date: "2026-09-13T23:59:00+00:00" },
  { id: 9, name: "Project_Task04", status: "in_progress", created_by: "Pasin Maclaurin", created: "2026-08-28T09:00:00+00:00", completed_at: null, description: "", category_id: 2, completed_by: null, updated: "2026-08-28T09:00:00+00:00", due_date: "2026-09-13T23:59:00+00:00" },
];

type DummyTicket = {
  id: number; name: string; description: string; category_id: number; completed_by: string | null; created: string;
  completed_at: string | null; status_id: number; created_by: string; assigned_id: string | null; updated: string; due_date: string;
};

// const dummyTickets: DummyTicket[] = [];

const dummyTickets: DummyTicket[] = [
  { id: 1, name: "Cannot upload experiment results", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 4, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T13:00:00+00:00" },
  { id: 2, name: "Cannot upload experiment results", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 3, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T12:00:00+00:00" },
  { id: 3, name: "Cannot upload experiment results", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 2, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T12:00:00+00:00" },
  { id: 4, name: "Cannot upload files in task 001", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 1, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T14:00:00+00:00" },
  { id: 5, name: "Cannot upload files in task 002", description: "", category_id: 1, completed_by: null, created: "2026-08-29T09:00:00+00:00", completed_at: null, status_id: 5, created_by: "Pasin Mclaren", assigned_id: null, updated: "2026-08-29T09:00:00+00:00", due_date: "2026-09-01T11:00:00+00:00" },
];

const dueToday = 1;
const dueBuckets = [
  { label: "This week", count: 2, color: "bg-(--primary-red)" },
  { label: "Next week", count: 4, color: "bg-(--primary-yellow)" },
  { label: "Later", count: 3, color: "bg-(--primary-blue)" },
];

const overviewCategories = [
  {
    name: "Report", chips: [
      { label: "This week", count: 1, color: "bg-(--primary-red)" },
      { label: "Next week", count: 4, color: "bg-(--primary-yellow)" },
    ]
  },
  {
    name: "Project", chips: [
      { label: "This week", count: 1, color: "bg-(--primary-red)" },
      { label: "Later", count: 3, color: "bg-(--primary-blue)" },
    ]
  },
];

function formatDueDate(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear()).slice(-2);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

// ================================================= Page layout =================================================

function Announcement() {
  const description = "Please be informed that all classes today are canceled due to an unexpected situation. Students should not attend and may use this time for rest or personal activities.\n\ngoogle.com and www.google.com\n\nhttps://youtu.be/dQw4w9WgXcQ";
  const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s.,!?;:]*)?)/g;
  const parts = description.split(urlRegex);
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
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActiveTask() {
  return (
    <div className="flex h-25 w-full gap-5">
      <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[30px] bg-(--panel-bg) p-0">
        <div className="flex flex-1 flex-col items-center justify-center gap-1"><h1 className="text-lg font-bold text-black">Due Today</h1><h1 className="text-5xl font-extrabold text-black">{dueToday}</h1></div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1"><h1 className="text-lg font-bold text-black">Active Task</h1><h1 className="text-5xl font-extrabold text-black">{dummyTasks.length}</h1></div>
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
    <div className="flex h-25 w-full gap-5">
      <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[30px] bg-(--panel-bg) p-0">
        <div className="flex flex-1 flex-col items-center justify-center gap-1"><h1 className="text-lg font-bold text-black">Due Today</h1><h1 className="text-5xl font-extrabold text-black">{dueToday}</h1></div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1"><h1 className="text-lg font-bold text-black">Active Task</h1><h1 className="text-5xl font-extrabold text-black">{dummyTasks.length}</h1></div>
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

function TaskOverview() {
  return (
    <div className="flex min-h-25 flex-1 flex-col gap-3 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
      <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <h1 className="text-base font-bold text-white">Task Overview</h1>
      </div>
    </div>
  );
}

function TaskOverview() {
  return (
    <div className="flex min-h-25 flex-1 flex-col gap-3 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
      <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <h1 className="text-base font-bold text-white">Task Overview</h1>
      </div>

      {dummyTasks.length === 0 ? (
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

function TaskList() {
  return (
    <div className="flex min-h-25 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Task Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Created by</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>
          );
        })
      )}
    </div>
  );
}

function TaskList() {
  return (
    <div className="flex min-h-25 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Task Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Created by</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {dummyTasks.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">Good job! You have completed all tasks.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dummyTasks.map((task) => (
            <div key={task.id} className="flex h-8 items-center gap-6 rounded-[20px] bg-white px-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${task.highlight ? "bg-(--primary-red)" : "bg-(--primary-blue)"}`} />
              <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
                <p className="truncate text-sm text-black">{task.name}</p>
                <p className="truncate text-sm text-black">{categoryMap[task.category_id]}</p>
                <p className="truncate text-sm text-black">{task.created_by}</p>
                <p className="text-sm text-black">{formatDueDate(task.due_date)}</p>
      {dummyTasks.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">Good job! You have completed all tasks.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dummyTasks.map((task) => (
            <div key={task.id} className="flex h-8 items-center gap-6 rounded-[20px] bg-white px-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${task.highlight ? "bg-(--primary-red)" : "bg-(--primary-blue)"}`} />
              <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
                <p className="truncate text-sm text-black">{task.name}</p>
                <p className="truncate text-sm text-black">{categoryMap[task.category_id]}</p>
                <p className="truncate text-sm text-black">{task.created_by}</p>
                <p className="text-sm text-black">{formatDueDate(task.due_date)}</p>
              </div>
            </div>
          ))}
          ))}
        </div>
      )}
      )}
    </div>
  );
}

function TicketList() {
function TicketList() {
  return (
    <div className="flex min-h-25 flex-1 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Ticket Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Status</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {dummyTickets.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">"Looks like everything's pretty peaceful around here. Hell yeah!"</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dummyTickets.map((ticket) => {
            const status = ticketStatusMap[ticket.status_id];
            const isComplete = status === "Complete";

            return (
              <div key={ticket.id} className={`flex h-8 items-center gap-4 rounded-[20px] px-2 ${isComplete ? "bg-gray-100" : "bg-white"}`}>
                <Image src={ticketStatusIcon[status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={status} draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{ticket.name}</p>
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{categoryMap[ticket.category_id]}</p>
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{status}</p>
                  <p className={`text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{formatDueDate(ticket.due_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    <div className="flex min-h-25 flex-1 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Ticket Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Status</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {dummyTickets.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">"Looks like everything's pretty peaceful around here. Hell yeah!"</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dummyTickets.map((ticket) => {
            const status = ticketStatusMap[ticket.status_id];
            const isComplete = status === "Complete";

            return (
              <div key={ticket.id} className={`flex h-8 items-center gap-4 rounded-[20px] px-2 ${isComplete ? "bg-gray-100" : "bg-white"}`}>
                <Image src={ticketStatusIcon[status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={status} draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{ticket.name}</p>
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{categoryMap[ticket.category_id]}</p>
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{status}</p>
                  <p className={`text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{formatDueDate(ticket.due_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskTicketList() {
  return (
    <div className="flex min-w-0 flex-1 shrink-0">
      <div className="flex h-full w-full flex-col gap-2 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
        <TaskList />
        <TicketList />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-100 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
        <ActiveTask />
        <TaskOverview />
        <TaskOverview />
      </div>
      <TaskTicketList />
    </main>
  );
}
