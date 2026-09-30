const TIME_ZONE = "Asia/Bangkok";

export function formatDueDate(iso: string | null) {
  if (iso === null) return "No due date";

  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: TIME_ZONE });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: TIME_ZONE });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: TIME_ZONE });
  const year = d.toLocaleDateString("en-US", { year: "numeric", timeZone: TIME_ZONE });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  });

  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

// full length -> "Friday 28 August 2026, 09:47"
export function formatFullDateTime(iso: string | null) {
  if (iso === null) return "No due date";

  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: TIME_ZONE });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: TIME_ZONE });
  const month = d.toLocaleDateString("en-US", { month: "long", timeZone: TIME_ZONE });
  const year = d.toLocaleDateString("en-US", { year: "numeric", timeZone: TIME_ZONE });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  });

  return `${weekday} ${day} ${month} ${year}, ${time}`;
}
