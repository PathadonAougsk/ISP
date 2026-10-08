const TIME_ZONE = "Asia/Bangkok";

// formatShortDate("2026-08-28T02:47:00Z") -> "Fri 28 Aug 2026"
export function formatShortDate(iso: string | null) {
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

  return `${weekday} ${day} ${month} ${year}`;
}

// formatFullDate("2026-08-28T02:47:00Z") -> "Friday 28 August 2026"
export function formatFullDate(iso: string | null) {
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

  return `${weekday} ${day} ${month} ${year}`;
}

// formatShortDateTime("2026-08-28T02:47:00Z") -> "Fri 28 Aug 2026, 09:47"
export function formatShortDateTime(iso: string | null) {
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

// truncateLabel("This is a very long label") -> "This is a very long…"
export function truncateLabel(text: string, maxLength = 20) {
  return text.length > maxLength ? text.slice(0, maxLength).trim() + "…" : text;
}

// getThaiDateParts("2026-08-28T02:47:00Z") -> { year: 2026, month: 8, day: 28, weekday: 5 }
export function getThaiDateParts(input: string | Date) {
  const date = new Date(input);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday") ?? ""],
  };
}

// maskEmail("someone@example.com") -> "*******@example.com"
export function maskEmail(value: string) {
  const at = value.indexOf("@");
  return at > 0 ? "*".repeat(at) + value.slice(at) : "*".repeat(value.length);
}
