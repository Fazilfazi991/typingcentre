import { appConfig } from "@/lib/config/app";

export type ExpiryStatus = "valid" | "expiring_soon" | "urgent" | "expires_today" | "expired" | "renewal_in_progress" | "unknown";
export type ExpiryBucket = "expired" | "next-7-days" | "days-8-to-30";

type ExpiryBoundaries = { today: string; tomorrow: string; day8: string; day31: string };

function asDate(value: string | Date | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateParts(value: Date, timezone: string = appConfig.timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Converts the timezone-free value emitted by datetime-local into a Dubai instant. */
export function dubaiDateTimeToUtcISOString(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error("Enter a valid due date.");
  const [, year, month, day, hour, minute, second = "00"] = match;
  // Asia/Dubai has a fixed UTC+04:00 offset and does not observe daylight saving time.
  return new Date(Date.UTC(+year, +month - 1, +day, +hour - 4, +minute, +second)).toISOString();
}

export function dubaiDateTimeLocalValue(value: string | Date | undefined) {
  const date = asDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: appConfig.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function expiryBoundaries(now = new Date(), timezone: string = appConfig.timezone): ExpiryBoundaries {
  const today = dateParts(now, timezone);
  return { today, tomorrow: addCalendarDays(today, 1), day8: addCalendarDays(today, 8), day31: addCalendarDays(today, 31) };
}

export function localDateTimeParts(now = new Date(), timezone: string = appConfig.timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

export function expiryBucketFromQuery(value: string | undefined): ExpiryBucket | undefined {
  if (value === "expired") return "expired";
  if (value === "7-days") return "next-7-days";
  if (value === "30-days") return "days-8-to-30";
  return undefined;
}

export function expiryQueryValue(bucket: ExpiryBucket) { return bucket === "next-7-days" ? "7-days" : bucket === "days-8-to-30" ? "30-days" : "expired"; }
export function expiryBucketLabel(bucket: ExpiryBucket) { return bucket === "expired" ? "Expired" : bucket === "next-7-days" ? "Next 7 days" : "Days 8 to 30"; }

export function applyExpiryBucket<T extends { lt: Function; gte: Function }>(query: T, bucket: ExpiryBucket, now = new Date(), timezone: string = appConfig.timezone): T {
  const boundaries = expiryBoundaries(now, timezone);
  if (bucket === "expired") return query.lt("expires_on", boundaries.today);
  if (bucket === "next-7-days") return query.gte("expires_on", boundaries.today).lt("expires_on", boundaries.day8);
  return query.gte("expires_on", boundaries.day8).lt("expires_on", boundaries.day31);
}

export function calculateDaysRemaining(expiryDate: string | Date | undefined, now = new Date(), timezone: string = appConfig.timezone) {
  const expiry = asDate(expiryDate);
  if (!expiry) return undefined;
  const today = expiryBoundaries(now, timezone).today;
  return Math.floor((Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate()) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function determineExpiryStatus(expiryDate: string | Date | undefined, renewalInProgress = false, now = new Date()): ExpiryStatus {
  if (renewalInProgress) return "renewal_in_progress";
  const days = calculateDaysRemaining(expiryDate, now);
  if (days === undefined) return "unknown";
  if (days < 0) return "expired";
  if (days === 0) return "expires_today";
  if (days <= 7) return "urgent";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

export function getRelativeExpiryText(expiryDate: string | Date | undefined, now = new Date()) {
  const days = calculateDaysRemaining(expiryDate, now);
  if (days === undefined) return "Expiry date unavailable";
  if (days < -1) return `Expired ${Math.abs(days)} days ago`;
  if (days === -1) return "Expired yesterday";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days} days remaining`;
}

export function formatDisplayDate(value: string | Date | undefined) {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(appConfig.locale, { timeZone: appConfig.timezone, day: "numeric", month: "short", year: "numeric" }).format(date) : "-";
}

export function formatDateTime(value: string | Date | undefined) {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(appConfig.locale, { timeZone: appConfig.timezone, dateStyle: "medium", timeStyle: "short" }).format(date) : "-";
}

export function formatTime(value: string | Date | undefined) {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(appConfig.locale, { timeZone: appConfig.timezone, hour: "numeric", minute: "2-digit" }).format(date) : "-";
}
