import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, CalendarPlus, Printer } from "lucide-react";
import type { Appointment, Provider, Service } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState, ErrorState, StatusBadge } from "@/components/product-ui";
import { AppointmentDetails } from "@/components/appointment-details";
import { downloadCalendar, prettyDate, money } from "@/lib/booking-utils";
export default function AppointmentConfirmation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const [manage, setManage] = useState(false);
  const query = useQuery<Appointment>({
    queryKey: [`/api/appointments/${appointmentId}`],
  });
  const a = query.data;
  const { data: provider } = useQuery<Provider>({
    queryKey: [`/api/providers/${a?.providerId}`],
    enabled: !!a,
  });
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: [`/api/providers/${a?.providerId}/services`],
    enabled: !!a,
  });
  if (query.isLoading) return <LoadingState label="Loading confirmation" />;
  const service = services.find((s) => s.id === a?.serviceId);
  return (
    <div className="public-container public-page confirmation-layout">
      {query.isError || !a ? (
        <ErrorState
          message="This confirmation is private. Open it in the browser where you booked, or sign in to the account used for the booking."
          retry={() => query.refetch()}
        />
      ) : (
        <>
          <header className="confirmation-banner">
            <span className="confirmation-check">
              <Check size={30} />
            </span>
            <p className="eyebrow">Booking #{String(a.id).padStart(5, "0")}</p>
            <h1>
              {a.status === "cancelled"
                ? "Your appointment was cancelled."
                : "Your time is reserved."}
            </h1>
            <p>Your appointment is saved. Keep these details for your visit.</p>
          </header>
          <section className="card card-body">
            <div className="spread" style={{ marginBottom: 25 }}>
              <h2 style={{ margin: 0 }}>{service?.name ?? "Appointment"}</h2>
              <StatusBadge status={a.status} />
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Your professional</dt>
                <dd>
                  {provider?.title} {provider?.name ?? "Loading…"}
                </dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{prettyDate(a.appointmentDate)}</dd>
              </div>
              <div>
                <dt>Time in Malawi (CAT)</dt>
                <dd>
                  {a.startTime} – {a.endTime}
                </dd>
              </div>
              <div>
                <dt>Booking value</dt>
                <dd>
                  {money(a.paymentAmount)} · Payment{" "}
                  {a.paymentStatus === "completed" ? "recorded" : "pending"}
                </dd>
              </div>
              <div>
                <dt>Client</dt>
                <dd>{a.clientName}</dd>
              </div>
              <div>
                <dt>Professional's contact</dt>
                <dd>
                  {provider && (
                    <a href={"mailto:" + provider.email}>{provider.email}</a>
                  )}
                </dd>
              </div>
            </dl>
            {a.notes && <p className="notice section-space">{a.notes}</p>}
          </section>
          <div className="confirmation-actions">
            <button
              className="btn btn-primary"
              onClick={() => downloadCalendar(a, service?.name, provider?.name)}
            >
              <CalendarPlus size={17} />
              Add to calendar
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              <Printer size={17} />
              Print details
            </button>
            {user &&
              (a.clientUserId === user.id ||
                user.providerId === a.providerId) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setManage(true)}
                >
                  Manage appointment
                </button>
              )}
          </div>
          <div className="notice">
            <strong>You're all set.</strong> Payment and any special
            arrangements are handled directly with your professional.{" "}
            {user
              ? "Your appointment is also available in your account."
              : "Guest confirmations stay private to this browser session. Save or print a copy for later."}
          </div>
          <div className="inline section-space no-print">
            <Link className="text-link" href="/find">
              Book another appointment
            </Link>
            {user && (
              <Link className="text-link" href="/my-bookings">
                My appointments
              </Link>
            )}
          </div>
          {manage && (
            <AppointmentDetails
              appointment={a}
              close={() => setManage(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
