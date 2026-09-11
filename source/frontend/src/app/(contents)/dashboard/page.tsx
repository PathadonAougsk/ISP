function Announcement() {
  const description = `Please be informed that all classes scheduled for today have been canceled due to an unexpected situation. Students are advised not to attend their scheduled classes and may use this time for rest or personal activities.

For further information regarding the situation and additional instructions, please watch the following official announcement:

https://youtu.be/dQw4w9WgXcQ`;

  return (
    <div className="h-90 w-full overflow-hidden rounded-[30px] bg-(--panel-bg)">
      {/* Main announcement */}
      <div className="flex h-full flex-col p-5 pb-0">
        <h1 className="line-clamp-2 text-3xl font-bold text-black">
          Test Topic Announcement 001 and show Line wrapping Test Topic
          Announcement 001 and show Line wrapping
        </h1>

        <div className="mt-4 text-base font-normal text-gray-700 line-clamp-6 whitespace-pre-line">
          {description}
        </div>

        {/* Readmore */}
        <div className="-mx-5 mt-auto">
          <div className="rounded-b-[30px] bg-(--primary-color-3) px-5 py-3 text-center">
            <button className="text-base font-semibold text-black underline">
              Readmore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveTask() {
  return (
    <div className="flex h-25 w-full">
      {/* Task Active */}
      <div className="w-[70%] rounded-[30px] bg-(--panel-bg) p-5">
        <div className="flex flex-row">
          <div className="flex flex-1 items-start text-base font-bold text-black">
            <h1></h1>
          </div>
        </div>
      </div>

      {/* Task Active Detail */}
      <div className="flex flex-1 flex-col pl-7.5">
        <div className="flex flex-1 items-start text-base font-bold text-black">
          <p>Due Tasks</p>
        </div>

        <div className="flex flex-2">
          {/* Bar Chart Area */}
          <div className="flex w-7.5 items-start">
            <div className="h-full w-5 rounded-[20px] bg-(--panel-bg)"></div>
          </div>

          {/* Due tasks */}
          <div className="flex flex-2 flex-col text-lg font-medium text-black">
            {/* This week */}
            <div className="flex">
              <div className="flex w-7.5 items-start">
                <div className="h-5 w-5 rounded-full bg-(--panel-bg)"></div>
              </div>

              <div className="flex w-5 items-start text-base">
                <p>1</p>
              </div>

              <div className="flex flex-1 items-start text-base">
                <p>
                  <span className="trancute">This week</span>
                </p>
              </div>
            </div>

            {/* Next week */}
            <div className="flex">
              <div className="flex w-7.5 items-center">
                <div className="h-5 w-5 rounded-full bg-(--panel-bg)"></div>
              </div>

              <div className="flex w-5 items-center text-base">
                <p>2</p>
              </div>

              <div className="flex flex-1 items-center text-base">
                <p>
                  <span className="trancute">Next week</span>
                </p>
              </div>
            </div>

            {/* Later */}
            <div className="flex">
              <div className="flex w-7.5 items-end">
                <div className="h-5 w-5 rounded-full bg-(--panel-bg)"></div>
              </div>

              <div className="flex w-5 items-end text-base">
                <p>3</p>
              </div>

              <div className="flex flex-1 items-end text-base">
                <p>
                  <span className="trancute">Later</span>
                </p>
              </div>
            </div>
          </div>
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
      <div className="flex w-[45%] min-w-100 flex-col gap-5">
        <Announcement />

        <ActiveTask />

        <LabOverview />
      </div>

      <TaskTicketList />
    </main>
  );
}
