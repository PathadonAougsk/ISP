const TIME_ZONE = "Asia/Bangkok";

// "Fri 28 Aug 2026" (short) or "Friday 28 August 2026" (long), Bangkok time
function datePart(d: Date, style: "short" | "long") {
  const part = (options: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-US", { ...options, timeZone: TIME_ZONE });

  const weekday = part({ weekday: style });
  const day = part({ day: "numeric" });
  const month = part({ month: style });
  const year = part({ year: "numeric" });

  return `${weekday} ${day} ${month} ${year}`;
}

// "09:47", 24 hour, Bangkok time
function timePart(d: Date) {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  });
}

// formatShortDate("2026-08-28T02:47:00Z") -> "Fri 28 Aug 2026"
// null -> "No {label} date", label default is "due"
export function formatShortDate(iso: string | null, label = "due") {
  if (iso === null) return `No ${label} date`;

  return datePart(new Date(iso), "short");
}

// formatShortDateTime("2026-08-28T02:47:00Z") -> "Fri 28 Aug 2026, 09:47"
export function formatShortDateTime(iso: string | null, label = "due") {
  if (iso === null) return `No ${label} date`;

  const d = new Date(iso);

  return `${datePart(d, "short")}, ${timePart(d)}`;
}

// formatLogDateTime("2026-11-14T08:47:00Z") -> "14/11/2026, 15:47"
export function formatLogDateTime(iso: string | null) {
  if (iso === null) return "";

  const d = new Date(iso);

  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  });

  return `${date}, ${timePart(d)}`;
}

// formatFullDateTime("2026-08-28T02:47:00Z") -> "Friday 28 August 2026, 09:47"
export function formatFullDateTime(iso: string | null, label = "due") {
  if (iso === null) return `No ${label} date`;

  const d = new Date(iso);

  return `${datePart(d, "long")}, ${timePart(d)}`;
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

// getThaiDateKey("2026-08-28T02:47:00Z") -> "2026-8-28" (Thai day, for compare)
export function getThaiDateKey(input: string | Date) {
  const { year, month, day } = getThaiDateParts(input);
  return `${year}-${month}-${day}`;
}

// maskEmail("someone@example.com") -> "*******@example.com"
export function maskEmail(value: string) {
  const at = value.indexOf("@");
  return at > 0 ? "*".repeat(at) + value.slice(at) : "*".repeat(value.length);
}

// toDateInputValue("2026-08-27T17:00:00Z") -> "2026-08-28" (Bangkok date), "" if null
export function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

// today in local time as yyyy-MM-dd
export function todayIso() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

// isPastDate("2026-08-28") -> true once that day has gone (local time).
// Empty means "no due date", which is never past.
export function isPastDate(isoDate: string) {
  if (!isoDate) return false;

  // iso string compare is ok
  return isoDate < todayIso();
}
