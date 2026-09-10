const COLORS = {
  page: "#FFFFFF",
  panel_bg: "#EAF1E3",
  primary_color_1: "#73A9AD",
  primary_color_2: "#90C8AC",
  primary_color_3: "#C4DFAA",
};

function Announcement() {
  return (
    <div className="h-[400px] w-full rounded-[30px] p-[20px]" style={{ backgroundColor: COLORS.panel_bg }}>
      <div className="flex flex-1 items-start font-bold text-3xl text-black">
        <p>Test Announcement 001</p>
      </div>
    </div>
  );
}

function ActiveTask() {
  return (
    <div className="flex h-[120px] w-full gap-[20px]">
      {/* Task Active */}
      <div className="w-[66%] rounded-[30px] p-[20px]" style={{ backgroundColor: COLORS.panel_bg }}>
      </div>

      {/* Task Active Detail */}
      <div className="flex flex-1 flex-col">
        {/* Due Tasks */}
        <div className="flex flex-1 items-start pl-[30px] font-bold text-lg text-black">
          <p>Due Tasks</p>
        </div>

        {/* Test texts */}
        <div className="flex flex-1 flex-col items-start pl-[30px] font-medium text-lg text-black">
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
    <div className="min-h-[400px] flex-1 rounded-t-[30px] rounded-b-none p-[20px]" style={{ backgroundColor: COLORS.panel_bg }}>
    </div>
  );
}

function TaskTicketList() {
  return (
    <div className="flex flex-1">
      <div className="h-full w-full rounded-t-[30px] rounded-b-none p-[20px]" style={{ backgroundColor: COLORS.panel_bg }}>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: COLORS.page }}>
      {/* Header */}
      <header className="flex h-[80px] w-full items-center pl-[30px] font-bold text-4xl text-black" style={{ backgroundColor: COLORS.primary_color_3 }}>
        Dashboard
      </header>

      <main className="flex min-h-[calc(100vh-80px)] w-full gap-[20px] pl-[20px] pr-[20px] pt-[20px]">
        {/* Left Side */}
        <div className="flex w-[40%] flex-col gap-[20px]">
          <Announcement />
          <ActiveTask />
          <LabOverview />
        </div>

        <TaskTicketList />
      </main>
    </div>
  );
}
