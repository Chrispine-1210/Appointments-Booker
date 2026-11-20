import { CalendarDays, MoreHorizontal } from "lucide-react";
import type { Appointment, Service } from "@shared/schema";
import { Avatar, EmptyState, StatusBadge } from "./product-ui";
import { money, prettyDate } from "@/lib/booking-utils";
export function AppointmentTable({
  appointments,
  services = [],
  onSelect,
  emptyAction,
}: {
  appointments: Appointment[];
  services?: Service[];
  onSelect: (a: Appointment) => void;
  emptyAction?: React.ReactNode;
}) {
  if (!appointments.length)
    return (
      <EmptyState
        icon={CalendarDays}
        title="Your schedule has room."
        description="Appointments will appear here when a client books, or when you add one yourself."
        action={emptyAction}
      />
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Client & service</th>
            <th>Date & time</th>
            <th>Status</th>
            <th>Booking value</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id}>
              <td>
                <div className="table-person">
                  <Avatar name={a.clientName} />
                  <div>
                    <strong>{a.clientName}</strong>
                    <small>
                      {services.find((s) => s.id === a.serviceId)?.name ??
                        "Appointment"}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                {prettyDate(a.appointmentDate, true)}
                <small>
                  {a.startTime} – {a.endTime}
                </small>
              </td>
              <td>
                <StatusBadge status={a.status} />
              </td>
              <td>
                {money(a.paymentAmount)}
                <small>
                  {a.paymentStatus === "completed"
                    ? "Recorded paid"
                    : "Payment pending"}
                </small>
              </td>
              <td>
                <button
                  aria-label={"View appointment for " + a.clientName}
                  className="icon-button"
                  onClick={() => onSelect(a)}
                >
                  <MoreHorizontal size={19} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
