import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import type { Appointment, Provider, Service } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Field, LoadingState, ErrorState, EmptyState } from "./product-ui";
import {
  addMinutes,
  localDate,
  money,
  prettyDate,
  todayKey,
} from "@/lib/booking-utils";
export default function BookingForm({
  provider,
  prefillClient = true,
}: {
  provider: Provider;
  prefillClient?: boolean;
}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const services = useQuery<Service[]>({
    queryKey: [`/api/providers/${provider.id}/services`],
  });
  const service = services.data?.find((s) => s.id === serviceId);
  const slots = useQuery<string[]>({
    queryKey: [
      `/api/providers/${provider.id}/available-slots`,
      { date, serviceId },
    ],
    enabled: !!serviceId && !!date,
    staleTime: 0,
  });
  useEffect(() => {
    setTime("");
  }, [date, serviceId]);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!service || !date || !time)
        throw Error("Choose a service, date and available time.");
      const data = {
        providerId: provider.id,
        serviceId: service.id,
        appointmentDate: date,
        startTime: time,
        endTime: addMinutes(time, service.duration),
        clientName: String(form.get("clientName")),
        clientEmail: String(form.get("clientEmail")),
        clientPhone: String(form.get("clientPhone")),
        notes: String(form.get("notes")),
      };
      return (
        await apiRequest("POST", "/api/appointments", data)
      ).json() as Promise<Appointment>;
    },
    onSuccess: async (a) => {
      await client.invalidateQueries();
      navigate("/confirmation/" + a.id);
    },
    onError: () => {
      void slots.refetch();
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!service || !date || !time) {
      setError("Choose your service, a working day and an available time.");
      return;
    }
    setError("");
    if (step === 0) setStep(1);
    else mutation.mutate(new FormData(e.currentTarget));
  };
  const nowTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Blantyre",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const available = (slots.data ?? []).filter(
    (t) => date !== todayKey() || t > nowTime,
  );
  if (services.isLoading) return <LoadingState label="Loading services" />;
  if (services.isError) return <ErrorState retry={() => services.refetch()} />;
  if (!services.data?.length)
    return (
      <EmptyState
        title="No services available yet"
        description="This professional hasn't published a bookable service. Contact them directly or check back later."
      />
    );
  return (
    <form className="booking-form" onSubmit={submit}>
      <p className="booking-step-label">
        {step === 0 ? "Choose your appointment" : "Your details & confirmation"}{" "}
        · Step {step + 1} of 2
      </p>
      <div hidden={step !== 0}>
        <h2>What can we help you with?</h2>
        <div className="service-options section-space">
          {services.data.map((s) => (
            <button
              className={
                "service-choice " + (serviceId === s.id ? "selected" : "")
              }
              type="button"
              aria-pressed={serviceId === s.id}
              key={s.id}
              onClick={() => setServiceId(s.id)}
            >
              <span>
                <strong>{s.name}</strong>
                <small>
                  {s.duration} minutes
                  {s.description ? " · " + s.description : ""}
                </small>
              </span>
              <span>{money(s.price)}</span>
            </button>
          ))}
        </div>
        <h2 className="section-space">Find your time.</h2>
        <div className="two-columns section-space">
          <div style={{ border: "1px solid #e5ebf5", borderRadius: 10 }}>
            <DatePicker
              mode="single"
              selected={date ? localDate(date) : undefined}
              onSelect={(value) => {
                if (value) setDate(format(value, "yyyy-MM-dd"));
              }}
              disabled={(day) =>
                format(day, "yyyy-MM-dd") < todayKey() ||
                !provider.workingHours?.days.includes(day.getDay())
              }
            />
          </div>
          <div>
            <p className="small muted">
              {date
                ? prettyDate(date)
                : "Choose a working day to see available times."}
            </p>
            {slots.isLoading ? (
              <LoadingState label="Checking availability" />
            ) : slots.isError ? (
              <ErrorState retry={() => slots.refetch()} />
            ) : date && service ? (
              <>
                {available.length ? (
                  <div className="slot-grid">
                    {available.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={time === t ? "selected" : ""}
                        aria-pressed={time === t}
                        onClick={() => setTime(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="notice">
                    No available times on this day. Try another date.
                  </p>
                )}
              </>
            ) : (
              <p className="notice">Select a service and date to continue.</p>
            )}
            <p className="small muted section-space">
              All times in Malawi (CAT, UTC+02:00).
            </p>
          </div>
        </div>
      </div>
      <div hidden={step !== 1}>
        <h2>A few details, and you're booked.</h2>
        <div className="form-stack section-space">
          <Field label="Your full name">
            <input
              name="clientName"
              autoComplete="name"
              required={step === 1}
              maxLength={200}
              defaultValue={
                user && prefillClient
                  ? (
                      (user.firstName ?? "") +
                      " " +
                      (user.lastName ?? "")
                    ).trim()
                  : ""
              }
            />
          </Field>
          <div className="form-grid">
            <Field label="Email address">
              <input
                name="clientEmail"
                type="email"
                autoComplete="email"
                required={step === 1}
                defaultValue={prefillClient ? (user?.email ?? "") : ""}
              />
            </Field>
            <Field label="Phone number">
              <input
                name="clientPhone"
                type="tel"
                autoComplete="tel"
                required={step === 1}
                maxLength={40}
                placeholder="+265…"
              />
            </Field>
          </div>
          <Field label="A note for your professional (optional)">
            <textarea
              name="notes"
              maxLength={5000}
              placeholder="Anything they should know before your visit?"
            />
          </Field>
        </div>
      </div>
      {service && date && time && (
        <div className="booking-summary">
          <div className="spread">
            <strong>{service.name}</strong>
            <strong>{money(service.price)}</strong>
          </div>
          <div className="spread">
            <span>{prettyDate(date, true)}</span>
            <span>
              {time} – {addMinutes(time, service.duration)} CAT
            </span>
          </div>
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Payment is arranged directly with your professional. This booking
            does not charge a card.
          </p>
        </div>
      )}
      {(error || mutation.error) && (
        <p className="form-error" role="alert">
          {error || mutation.error?.message}
        </p>
      )}
      <div className="booking-actions">
        {step === 1 ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep(0)}
          >
            Back to times
          </button>
        ) : (
          <span />
        )}
        <button
          disabled={
            mutation.isPending || (step === 0 && (!service || !date || !time))
          }
          className="btn btn-primary"
        >
          {mutation.isPending
            ? "Reserving your time…"
            : step === 0
              ? "Continue to details"
              : "Confirm appointment"}
        </button>
      </div>
      {step === 1 && (
        <p className="small muted section-space">
          Your appointment is confirmed on screen. Keep the confirmation and add
          it to your calendar.
        </p>
      )}
    </form>
  );
}
