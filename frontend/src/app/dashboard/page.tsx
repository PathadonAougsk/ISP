function Announcement() {
  return (
    <div className="h-90 w-full rounded-[30px] bg-(--panel-bg) p-5">
      <div className="flex flex-1 items-start font-bold text-3xl text-black">
        <p>Test Announcement 001</p>
      </div>
    </div>
  );
}

function ActiveTask() {
  return (
    <div className="flex h-30 w-full gap-5">
      {/* Task Active */}
      <div className="w-[66%] rounded-[30px] bg-(--panel-bg) p-5"></div>

      {/* Task Active Detail */}
      <div className="flex flex-1 flex-col">
        {/* Due Tasks */}
        <div className="flex flex-1 items-start pl-7.5 font-bold text-lg text-black">
          <p>Due Tasks</p>
        </div>

        {/* Test texts */}
        <div className="flex flex-1 flex-col items-start pl-7.5 font-medium text-lg text-black">
          <p>1</p>
          <p>2</p>
          <p>3</p>
        </div>
      </div>
    </div>
  );
}

function LabOverview() {
  return (
    <div className="min-h-100 flex-1 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-5"></div>
  );
}

function TaskTicketList() {
  return (
    <div className="flex flex-1">
      <div className="h-full w-full rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-5"></div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex min-h-full w-full gap-5 bg-white px-5 pt-5">
      {/* Left Side */}
      <div className="flex w-[40%] flex-col gap-5">
        <Announcement />

        <ActiveTask />

        <LabOverview />
      </div>

      <TaskTicketList />
    </main>
  );
}
