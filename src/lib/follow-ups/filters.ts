import { appConfig } from "@/lib/config/app";
import { expiryBoundaries } from "@/lib/dates/expiry";

export type FollowUpDateFilter = "today";

export function followUpDateFromQuery(value: string | undefined): FollowUpDateFilter | undefined {
  return value === "today" ? value : undefined;
}

export function followUpDatePath(filter: FollowUpDateFilter) {
  return `/follow-ups?date=${filter}` as const;
}

function zonedMidnightUtc(date: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    const observed = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    instant += target - observed;
  }
  return new Date(instant).toISOString();
}

export function followUpTodayBounds(now = new Date(), timezone: string = appConfig.timezone) {
  const { today, tomorrow } = expiryBoundaries(now, timezone);
  return { start: zonedMidnightUtc(today, timezone), end: zonedMidnightUtc(tomorrow, timezone) };
}

export function applyFollowUpDateFilter<T extends { gte: Function; lt: Function; neq: Function }>(query: T, filter: FollowUpDateFilter, now = new Date(), timezone: string = appConfig.timezone): T {
  const { start, end } = followUpTodayBounds(now, timezone);
  return query.gte("due_at", start).lt("due_at", end).neq("status", "completed");
}
