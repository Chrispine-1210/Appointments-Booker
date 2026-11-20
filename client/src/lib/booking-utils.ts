import type { Appointment } from "@shared/schema";
export function todayKey() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Blantyre",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function localDate(key: string) {
  return new Date(`${key}T12:00:00`);
}
export function prettyDate(key: string, short = false) {
  return localDate(key).toLocaleDateString("en-GB", {
    day: "numeric",
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  });
}
export function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}
export function addMinutes(time: string, duration: number) {
  const [h, m] = time.split(":").map(Number);
  const end = h * 60 + m + duration;
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}
export function downloadCalendar(
  appointment: Appointment,
  service = "Appointment",
  provider = "",
) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const stamp = (time: string) =>
    new Date(`${appointment.appointmentDate}T${time}:00+02:00`)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookingPro//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:booking-${appointment.id}@bookingpro`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART:${stamp(appointment.startTime)}`,
    `DTEND:${stamp(appointment.endTime)}`,
    `SUMMARY:${escape(service)}`,
    `DESCRIPTION:${escape(provider ? `Appointment with ${provider}` : "BookingPro appointment")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `appointment-${appointment.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
