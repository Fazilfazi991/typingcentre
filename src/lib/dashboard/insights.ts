import { calculateDaysRemaining } from "@/lib/dates/expiry";

export type PortfolioDocument = { expires_on: string; status?: string | null };
export type HealthTone = "success" | "warning" | "danger" | "purple";

export const HEALTH_PRESENTATION = [
  { key: "valid", label: "Valid", tone: "success" as HealthTone, icon: "shield" },
  { key: "expiringSoon", label: "Expiring Soon", tone: "warning" as HealthTone, icon: "clock" },
  { key: "expired", label: "Expired", tone: "danger" as HealthTone, icon: "alert" },
  { key: "renewalInProgress", label: "Renewal in Progress", tone: "purple" as HealthTone, icon: "refresh" },
] as const;

export function calculatePortfolioInsights(records: PortfolioDocument[], now = new Date(), timezone = "Asia/Dubai") {
  const health = { valid: 0, expiringSoon: 0, expired: 0, renewalInProgress: 0 };
  const upcoming = { days0To30: 0, days31To60: 0, days61To90: 0 };

  for (const record of records) {
    const days = calculateDaysRemaining(record.expires_on, now, timezone);
    if (days === undefined) continue;

    if (record.status === "renewal_in_progress") health.renewalInProgress += 1;
    else if (days < 0) health.expired += 1;
    else if (days <= 30) health.expiringSoon += 1;
    else health.valid += 1;

    if (days >= 0 && days <= 30) upcoming.days0To30 += 1;
    else if (days <= 60 && days >= 31) upcoming.days31To60 += 1;
    else if (days <= 90 && days >= 61) upcoming.days61To90 += 1;
  }

  const total = Object.values(health).reduce((sum, value) => sum + value, 0);
  const upcomingTotal = Object.values(upcoming).reduce((sum, value) => sum + value, 0);
  return { health, total, upcoming, upcomingTotal };
}

export function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

export function activityPresentation(entityType: string | null | undefined, message: string) {
  const value = `${entityType ?? ""} ${message}`.toLowerCase();
  if (value.includes("follow")) return { tone: "teal", icon: "check" } as const;
  if (value.includes("customer")) return { tone: "purple", icon: "user" } as const;
  if (value.includes("renew")) return { tone: "green", icon: "refresh" } as const;
  if (value.includes("document") || value.includes("licence") || value.includes("license")) return { tone: "orange", icon: "document" } as const;
  return { tone: "blue", icon: "message" } as const;
}

export function formatActivityTime(value: string, now = new Date(), timezone = "Asia/Dubai") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const dateKey = (instant: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dateKey(date) === dateKey(now)) return "Today";
  if (dateKey(date) === dateKey(yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-AE", { timeZone: timezone, month: "short", day: "numeric" }).format(date);
}
