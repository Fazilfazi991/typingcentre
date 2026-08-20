import { addCalendarDays, expiryBoundaries } from "@/lib/dates/expiry";

export type ReportRange = "all" | "today" | "7d" | "30d" | "month" | "custom";
export type ReportOwner = "all" | "customers" | "companies";
export type ReportSort = "expiry-asc" | "expiry-desc" | "name" | "status";

export type ReportFilters = {
  range: ReportRange;
  owner: ReportOwner;
  typeId?: string;
  sort: ReportSort;
  start?: string;
  end?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function reportFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): ReportFilters {
  const value = (name: string) => (typeof params[name] === "string" ? params[name] : undefined);
  const range = value("range");
  const owner = value("owner");
  const sort = value("sort");
  const start = value("start");
  const end = value("end");
  return {
    range:
      range === "today" ||
      range === "7d" ||
      range === "30d" ||
      range === "month" ||
      range === "custom"
        ? range
        : "all",
    owner: owner === "customers" || owner === "companies" ? owner : "all",
    typeId: value("type") || undefined,
    sort: sort === "expiry-desc" || sort === "name" || sort === "status" ? sort : "expiry-asc",
    start: start && datePattern.test(start) ? start : undefined,
    end: end && datePattern.test(end) ? end : undefined,
  };
}

export function reportRangeBounds(filters: ReportFilters, now: Date, timezone: string) {
  const boundaries = expiryBoundaries(now, timezone);
  if (filters.range === "today") return { start: boundaries.today, end: boundaries.tomorrow };
  if (filters.range === "7d") return { start: boundaries.today, end: boundaries.day8 };
  if (filters.range === "30d") return { start: boundaries.today, end: boundaries.day31 };
  if (filters.range === "month") {
    const [year, month] = boundaries.today.split("-").map(Number);
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    return {
      start: first,
      end: `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`,
    };
  }
  if (filters.range === "custom" && filters.start && filters.end && filters.start <= filters.end) {
    return { start: filters.start, end: addCalendarDays(filters.end, 1) };
  }
  return undefined;
}

export function reportRangeLabel(filters: ReportFilters) {
  if (filters.range === "today") return "Today";
  if (filters.range === "7d") return "Next 7 days";
  if (filters.range === "30d") return "Next 30 days";
  if (filters.range === "month") return "This month";
  if (filters.range === "custom")
    return filters.start && filters.end ? `${filters.start} to ${filters.end}` : "Custom range";
  return "All active documents";
}

export function zonedMidnightUtc(date: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    const observed = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    instant += target - observed;
  }
  return new Date(instant).toISOString();
}
