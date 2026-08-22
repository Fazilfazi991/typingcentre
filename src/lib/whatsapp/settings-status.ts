import { addCalendarDays, localDateTimeParts } from "@/lib/dates/expiry";

type WhatsAppSettingsStatusInput = {
  enabled: boolean;
  deliveryTime: string;
  lastSentAt: string | null;
  timezone: string;
  now?: Date;
};

function timeMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function displayTime(value: string) {
  const [hour = "0", minute = "00"] = value.split(":");
  return new Intl.DateTimeFormat("en-AE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, Number(hour), Number(minute))));
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function getWhatsAppSettingsStatus({
  enabled,
  deliveryTime,
  lastSentAt,
  timezone,
  now = new Date(),
}: WhatsAppSettingsStatusInput) {
  const current = localDateTimeParts(now, timezone);
  const sentToday = Boolean(lastSentAt && localDateTimeParts(new Date(lastSentAt), timezone).date === current.date);
  const deliveryTimeLabel = displayTime(deliveryTime);

  if (!enabled) {
    return {
      message: "Automatic WhatsApp expiry summaries are currently disabled.",
      nextScheduledDelivery: null,
      sentToday: false,
    };
  }

  const sentAtLabel = sentToday && lastSentAt
    ? new Intl.DateTimeFormat("en-AE", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(lastSentAt))
    : null;
  const scheduledDate = sentToday || timeMinutes(current.time) >= timeMinutes(deliveryTime)
    ? addCalendarDays(current.date, 1)
    : current.date;

  return {
    message: sentAtLabel
      ? `Today’s summary was sent at ${sentAtLabel}. The next automatic summary will use the new delivery time tomorrow.`
      : `Next automatic summary is scheduled for ${deliveryTimeLabel}.`,
    nextScheduledDelivery: `Next scheduled delivery: ${displayDate(scheduledDate)}, ${deliveryTimeLabel}`,
    sentToday,
  };
}
