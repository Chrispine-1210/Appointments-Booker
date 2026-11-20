import { useState } from "react";
import {
  addDays,
  addMonths,
  startOfWeek,
  startOfMonth,
  format,
  isSameMonth,
  endOfMonth,
  differenceInCalendarDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Appointment } from "@shared/schema";
import { useAppointments, useServices } from "@/hooks/useWorkspace";
import {
  PageHeader,
  LinkButton,
  LoadingState,
  ErrorState,
} from "@/components/product-ui";
import { AppointmentDetails } from "@/components/appointment-details";
import { AppointmentTable } from "@/components/appointment-table";
import { localDate, todayKey } from "@/lib/booking-utils";
export default function Calendar() {
  const [month, setMonth] = useState(startOfMonth(localDate(todayKey())));
  const [view, setView] = useState("Month");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const query = useAppointments();
  const { data: services = [] } = useServices();
  const start = startOfWeek(month, { weekStartsOn: 1 });
  const count =
    Math.ceil((differenceInCalendarDays(endOfMonth(month), start) + 1) / 7) * 7;
  const records = query.data ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Make space for your day"
        title="Calendar"
        description="See what's ahead. Open an appointment to view details or change its time."
        actions={
          <LinkButton href="/new-appointment">
            <Plus size={17} />
            Add appointment
          </LinkButton>
        }
      />
      <section className="card">
        <div className="schedule-toolbar">
          <div className="inline">
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => setMonth(addMonths(month, -1))}
            >
              <ChevronLeft size={19} />
            </button>
            <h2>{format(month, "MMMM yyyy")}</h2>
            <button
              className="icon-button"
              aria-label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight size={19} />
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setMonth(startOfMonth(localDate(todayKey())))}
            >
              Today
            </button>
          </div>
          <div className="segmented">
            {["Month", "Agenda"].map((v) => (
              <button
                key={v}
                className={view === v ? "active" : ""}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : view === "Agenda" ? (
          <AppointmentTable
            appointments={records
              .filter((a) =>
                a.appointmentDate.startsWith(format(month, "yyyy-MM")),
              )
              .sort((a, b) =>
                (a.appointmentDate + a.startTime).localeCompare(
                  b.appointmentDate + b.startTime,
                ),
              )}
            services={services}
            onSelect={setSelected}
          />
        ) : (
          <div className="month-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div className="month-label" key={d}>
                {d}
              </div>
            ))}
            {Array.from({ length: count }, (_, i) => addDays(start, i)).map(
              (d) => {
                const date = format(d, "yyyy-MM-dd");
                const list = records
                  .filter((a) => a.appointmentDate === date)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div
                    key={date}
                    className={
                      "month-cell " +
                      (!isSameMonth(d, month) ? "off-month" : "")
                    }
                  >
                    <span
                      className={
                        "month-day " + (date === todayKey() ? "today" : "")
                      }
                    >
                      {format(d, "d")}
                    </span>
                    {list.map((a) => (
                      <button
                        key={a.id}
                        className={"month-event " + a.status}
                        aria-label={
                          a.startTime + " " + a.clientName + " " + a.status
                        }
                        onClick={() => setSelected(a)}
                      >
                        {a.startTime} · {a.clientName}
                      </button>
                    ))}
                  </div>
                );
              },
            )}
          </div>
        )}
        <div className="calendar-legend">
          <span>
            <i />
            Appointments · Malawi time (CAT)
          </span>
          <span>
            <i style={{ background: "#dfa6a6" }} />
            Cancelled
          </span>
        </div>
      </section>
      {selected && (
        <AppointmentDetails
          appointment={selected}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
