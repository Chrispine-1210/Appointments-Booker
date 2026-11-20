import { CalendarCheck2, Activity, ClipboardList } from "lucide-react";
import { useAppointments, useTasks } from "@/hooks/useWorkspace";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ErrorState,
  StatusBadge,
} from "@/components/product-ui";
import { prettyDate } from "@/lib/booking-utils";
export default function Notifications() {
  const appointments = useAppointments();
  const tasks = useTasks();
  const events = [
    ...(appointments.data ?? []).map((a) => ({
      id: "a" + a.id,
      title: "Appointment saved",
      text:
        prettyDate(a.appointmentDate, true) +
        " · " +
        a.startTime +
        " CAT · " +
        a.clientName,
      time: a.createdAt,
      status: a.status,
      kind: "appointment",
    })),
    ...(tasks.data ?? []).map((t) => ({
      id: "t" + t.id,
      title: t.title,
      text: "Task in your workspace",
      time: t.createdAt,
      status: t.status ?? "pending",
      kind: "task",
    })),
  ].sort(
    (a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime(),
  );
  return (
    <>
      <PageHeader
        eyebrow="The latest in your workspace"
        title="Activity"
        description="Saved appointments and tasks, with their current status. A clear view of what's taking shape."
      />
      <section className="card">
        {appointments.isLoading ? (
          <LoadingState />
        ) : appointments.isError ? (
          <ErrorState retry={() => appointments.refetch()} />
        ) : !events.length ? (
          <EmptyState
            icon={Activity}
            title="A quiet start."
            description="Your saved appointments and tasks will appear here as you begin using your workspace."
          />
        ) : (
          <div className="timeline">
            {events.map((e) => (
              <article className="timeline-item" key={e.id}>
                <span>
                  {e.kind === "appointment" ? (
                    <CalendarCheck2 size={18} />
                  ) : (
                    <ClipboardList size={18} />
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="spread">
                    <h3>{e.title}</h3>
                    <StatusBadge status={e.status} />
                  </div>
                  <p>{e.text}</p>
                  <time>
                    {e.time
                      ? new Date(e.time).toLocaleString("en-GB", {
                          timeZone: "Africa/Blantyre",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Date unavailable"}{" "}
                    CAT
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
