import { useState } from "react";
import { Search, Plus } from "lucide-react";
import type { Appointment } from "@shared/schema";
import { useAppointments, useServices } from "@/hooks/useWorkspace";
import {
  PageHeader,
  LinkButton,
  LoadingState,
  ErrorState,
} from "@/components/product-ui";
import { AppointmentTable } from "@/components/appointment-table";
import { AppointmentDetails } from "@/components/appointment-details";
import { todayKey } from "@/lib/booking-utils";
export default function Appointments() {
  const query = useAppointments();
  const { data: services = [] } = useServices();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const list = (query.data ?? [])
    .filter(
      (a) =>
        (a.clientName + " " + a.clientEmail)
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (filter === "All" ||
          (filter === "Upcoming" &&
            a.appointmentDate >= todayKey() &&
            !["cancelled", "completed"].includes(a.status)) ||
          a.status === filter.toLowerCase()),
    )
    .sort((a, b) =>
      (b.appointmentDate + b.startTime).localeCompare(
        a.appointmentDate + a.startTime,
      ),
    );
  return (
    <>
      <PageHeader
        eyebrow="Your schedule"
        title="Appointments"
        description="Every booking, with the details you need to take care of it."
        actions={
          <LinkButton href="/new-appointment">
            <Plus size={17} />
            Add appointment
          </LinkButton>
        }
      />
      <section className="card">
        <div className="filters">
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="search-field"
              aria-label="Search appointments"
              placeholder="Search clients or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="segmented" aria-label="Filter appointments">
            {["All", "Upcoming", "Completed", "Cancelled"].map((f) => (
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
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : (
          <AppointmentTable
            appointments={list}
            services={services}
            onSelect={setSelected}
            emptyAction={
              <button
                className="text-link"
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                }}
              >
                Clear filters
              </button>
            }
          />
        )}
        <div className="table-footer">
          {list.length} appointment{list.length === 1 ? "" : "s"} · Prices are
          booking values, not settled collections.
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
