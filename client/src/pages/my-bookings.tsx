import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, Search } from "lucide-react";
import type { Appointment, Provider } from "@shared/schema";
import {
  PageHeader,
  StatusBadge,
  Avatar,
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/product-ui";
import { AppointmentDetails } from "@/components/appointment-details";
import { prettyDate, downloadCalendar } from "@/lib/booking-utils";
export default function MyBookings() {
  // Personal bookings stay scoped to the booking creator, including when that
  // account also owns a professional profile.
  const query = useQuery<Appointment[]>({ queryKey: ["/api/appointments/my"] });
  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["/api/providers"],
  });
  const [filter, setFilter] = useState("Upcoming");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const all = query.data ?? [];
  const list = all
    .filter(
      (a) =>
        filter === "All" ||
        (filter === "Upcoming" &&
          new Date(`${a.appointmentDate}T${a.startTime}:00+02:00`).getTime() >
            Date.now() &&
          !["cancelled", "completed"].includes(a.status)) ||
        (filter === "Past" &&
          (new Date(`${a.appointmentDate}T${a.startTime}:00+02:00`).getTime() <=
            Date.now() ||
            ["cancelled", "completed"].includes(a.status))),
    )
    .sort((a, b) =>
      (a.appointmentDate + a.startTime).localeCompare(
        b.appointmentDate + b.startTime,
      ),
    );
  return (
    <>
      <PageHeader
        eyebrow="A little more organised"
        title="My appointments"
        description="Your next appointment and the ones behind you, all in one place."
        actions={
          <Link href="/find" className="btn btn-primary">
            <Search size={16} />
            Find a professional
          </Link>
        }
      />
      <div className="segmented" style={{ marginBottom: 24 }}>
        {["Upcoming", "Past", "All"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : !list.length ? (
        <section className="card">
          <EmptyState
            title="Nothing on this page just yet."
            description="Find a professional and choose your next appointment, or check your other bookings."
            action={
              <Link href="/find" className="btn btn-primary">
                Explore professionals
              </Link>
            }
          />
        </section>
      ) : (
        <div className="stack">
          {list.map((a) => (
            <article className="card card-body" key={a.id}>
              <div className="spread">
                <div className="inline">
                  <Avatar
                    name={
                      providers.find((p) => p.id === a.providerId)?.name ??
                      a.clientName
                    }
                  />
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {providers.find((p) => p.id === a.providerId)?.name ??
                        "Your appointment"}
                    </h2>
                    <p className="small muted" style={{ margin: "5px 0 0" }}>
                      Booking #{String(a.id).padStart(5, "0")}
                    </p>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div
                className="spread section-space"
                style={{ flexWrap: "wrap" }}
              >
                <div className="inline small muted">
                  <CalendarDays size={18} />
                  {prettyDate(a.appointmentDate)} · {a.startTime} – {a.endTime}{" "}
                  CAT
                </div>
                <div className="inline">
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => downloadCalendar(a)}
                  >
                    <CalendarPlus size={15} />
                    Add to calendar
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => setSelected(a)}
                  >
                    View & manage
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <AppointmentDetails
          appointment={selected}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
