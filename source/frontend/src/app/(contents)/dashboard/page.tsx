import { Fragment } from "react";

function Announcement() {
  const description = "Please be informed that all classes today are canceled due to an unexpected situation. Students should not attend and may use this time for rest or personal activities.\n\ngoogle.com and www.google.com\n\nhttps://youtu.be/dQw4w9WgXcQ";
  const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s.,!?;:]*)?)/g;
  const parts = description.split(urlRegex);

  return (
    <div className="h-90 w-full overflow-hidden rounded-[30px] bg-(--panel-bg)">
      <div className="flex h-full flex-col p-5 pb-0">
        <h1 className="text-3xl font-bold text-black line-clamp-2">
          Test Topic Announcement 001 and show Line wrapping Test Topic Announcement 001 and show Line wrapping
        </h1>

        <div className="mt-4 text-base font-normal text-gray-700 line-clamp-7 whitespace-pre-line">
          {parts.map((part, index) => (
            <Fragment key={index}>
              {index % 2 === 1 ? (
                <a href={part.startsWith("http") ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="italic underline">
                  {part}
                </a>
              ) : part}
            </Fragment>
          ))}
        </div>

        <div className="-mx-5 mt-auto">
          <div className="rounded-b-[30px] bg-(--primary-color-3) px-5 py-3 text-center">
            <button className="text-base font-semibold text-black underline">Readmore</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveTask() {
  return (
    <div className="flex h-25 w-full gap-5">
      {/* Task Active */}
      <div className="flex-1 rounded-[30px] bg-(--panel-bg) p-5">
        <div className="flex">
          <div className="flex flex-1 items-start text-base font-bold text-black">
            <h1></h1>
          </div>
        </div>
      </div>

      {/* Task Active Detail */}
      <div className="flex w-fit shrink-0 flex-col pr-5">
        <div className="flex items-start text-base font-bold text-black"><p>Due Tasks</p></div>

        <div className="flex flex-1">
          {/* Bar Chart Area */}
          <div className="flex w-7.5 items-start">
            <div className="h-full w-5 rounded-[20px] bg-(--panel-bg)" />
          </div>

          {/* Due Tasks */}
          <div className="flex flex-1 flex-col justify-between text-lg font-medium text-black">
            {/* This week - Top */}
            <div className="flex items-center">
              <div className="flex w-7.5 items-center"><div className="h-5 w-5 rounded-full bg-(--panel-bg)" /></div>
              <div className="flex w-5 items-center text-base"><p>1</p></div>
              <div className="flex flex-1 items-center text-base"><p>This week</p></div>
            </div>

            {/* Next week - Middle */}
            <div className="flex items-center">
              <div className="flex w-7.5 items-center"><div className="h-5 w-5 rounded-full bg-(--panel-bg)" /></div>
              <div className="flex w-5 items-center text-base"><p>2</p></div>
              <div className="flex flex-1 items-center text-base"><p>Next week</p></div>
            </div>

            {/* Later - Bottom */}
            <div className="flex items-center">
              <div className="flex w-7.5 items-center"><div className="h-5 w-5 rounded-full bg-(--panel-bg)" /></div>
              <div className="flex w-5 items-center text-base"><p>3</p></div>
              <div className="flex flex-1 items-center text-base"><p>Later</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabOverview() {
  return <div className="min-h-100 flex-1 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-5" />;
}

function TaskTicketList() {
  return (
    <div className="flex min-w-150 max-w-275 flex-1 shrink-0">
      <div className="h-full w-full rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-5" />
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex min-h-full min-w-max w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      {/* Left Side */}
      <div className="flex w-[40%] min-w-100 max-w-175 shrink-0 flex-col gap-5">
        <Announcement />
        <ActiveTask />
        <LabOverview />
      </div>

      <TaskTicketList />
    </main>
  );
}
