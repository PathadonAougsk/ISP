const TIME_ZONE = "Asia/Bangkok";

// formatDueDate("2026-08-28T02:47:00Z") -> "Fri 28 Aug 2026, 09:47"
export function formatDueDate(iso: string | null) {
  if (iso === null) return "No due date";

  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: TIME_ZONE,
  });
  const day = d.toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: TIME_ZONE,
  });
  const month = d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: TIME_ZONE,
  });
  const year = d.toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  });

  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

// formatFullDateTime("2026-08-28T02:47:00Z") -> "Friday 28 August 2026, 09:47"
export function formatFullDateTime(iso: string | null) {
  if (iso === null) return "No due date";

  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: TIME_ZONE,
  });
  const day = d.toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: TIME_ZONE,
  });
  const month = d.toLocaleDateString("en-US", {
    month: "long",
    timeZone: TIME_ZONE,
  });
  const year = d.toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  });

  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

// shift date so getUTC* read Thai clock. only for read day or week, dont format it again
export function localizeDateTime(input: string | Date): Date {
  const date = new Date(input);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      date.getUTCMilliseconds(),
    ),
  );
}
