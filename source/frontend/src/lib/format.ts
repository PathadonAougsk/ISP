const TIME_ZONE = "Asia/Bangkok";

export function formatDueDate(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: TIME_ZONE });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: TIME_ZONE });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: TIME_ZONE });
  const year = d.toLocaleDateString("en-US", { year: "2-digit", timeZone: TIME_ZONE });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE });
  return `${weekday} ${day} ${month} ${year}, ${time}`;
}
