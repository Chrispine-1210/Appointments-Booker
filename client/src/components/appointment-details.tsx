import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarPlus,
  Check,
  Phone,
  Mail,
  X,
  CalendarDays,
} from "lucide-react";
import type { Appointment, Provider, Service } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  addMinutes,
  downloadCalendar,
  money,
  prettyDate,
  todayKey,
} from "@/lib/booking-utils";
import { Avatar, Field, StatusBadge } from "./product-ui";
export function AppointmentDetails({
  appointment,
  close,
}: {
  appointment: Appointment;
  close: () => void;
}) {
  const { providerId } = useAuth();
  const client = useQueryClient();
  const { toast } = useToast();
  const [reschedule, setReschedule] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [date, setDate] = useState(appointment.appointmentDate);
  const [time, setTime] = useState("");
  const { data: provider } = useQuery<Provider>({
    queryKey: [`/api/providers/${appointment.providerId}`],
  });
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: [`/api/providers/${appointment.providerId}/services`],
  });
  const payment = useQuery<{ enabled: boolean; mode: string | null }>({
    queryKey: [`/api/appointments/${appointment.id}/payment-options`],
  });
  const checkout = useMutation({
    mutationFn: async () =>
      (
        await apiRequest(
          "POST",
          `/api/appointments/${appointment.id}/checkout`,
          {},
        )
      ).json(),
    onSuccess: (data) => {
      window.location.assign(data.checkoutUrl);
    },
  });
  const service = services.find((s) => s.id === appointment.serviceId);
  const slots = useQuery<string[]>({
    queryKey: [
      `/api/providers/${appointment.providerId}/available-slots`,
      { date, serviceId: appointment.serviceId },
    ],
    enabled: reschedule && !!date,
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: async ({
      action,
      data,
    }: {
      action: string;
      data?: unknown;
    }) => {
      await apiRequest(
        action === "status"
          ? "PATCH"
          : action === "reschedule"
            ? "PATCH"
            : "POST",
        `/api/appointments/${appointment.id}` +
          (action === "status" ? "" : "/" + action),
        data,
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries();
      toast({
        title: "Appointment updated",
        description: "Your changes are saved.",
      });
      close();
    },
  });
  const active =
    appointment.status !== "cancelled" && appointment.status !== "completed";
  const nowTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Blantyre",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const available = (slots.data ?? []).filter(
    (t) => date !== todayKey() || t > nowTime,
  );
  const owner = providerId === appointment.providerId;
  const future =
    new Date(
      `${appointment.appointmentDate}T${appointment.startTime}:00+02:00`,
    ).getTime() > Date.now();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>Appointment details</DialogTitle>
        <DialogDescription>
          Booking #{String(appointment.id).padStart(5, "0")} · Malawi time (CAT)
        </DialogDescription>
        <div className="inline section-space">
          <Avatar name={appointment.clientName} />
          <div>
            <strong>{appointment.clientName}</strong>
            <p className="small muted" style={{ margin: 0 }}>
              {service?.name ?? "Appointment"}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        {payment.data?.enabled && (
          <div className="notice section-space">
            <p>
              {payment.data.mode === "test"
                ? "Test checkout — no real payment"
                : "Pay securely through this professional’s payment provider."}
            </p>
            <button
              className="btn btn-primary"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending
                ? "Opening checkout…"
                : payment.data.mode === "test"
                  ? "Open test checkout"
                  : "Pay online"}
            </button>
            {checkout.error && (
              <p className="form-error">{checkout.error.message}</p>
            )}
          </div>
        )}
        <dl className="detail-grid section-space">
          <div>
            <dt>Date</dt>
            <dd>{prettyDate(appointment.appointmentDate)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>
              {appointment.startTime} – {appointment.endTime}
            </dd>
          </div>
          <div>
            <dt>Professional</dt>
            <dd>{provider?.name ?? "Loading…"}</dd>
          </div>
          <div>
            <dt>Booking value</dt>
            <dd>
              {money(appointment.paymentAmount)} ·{" "}
              {appointment.paymentStatus === "completed"
                ? "Recorded paid"
                : "Payment pending"}
            </dd>
          </div>
        </dl>
        {appointment.notes && (
          <div className="notice section-space">{appointment.notes}</div>
        )}
        <div className="inline section-space">
          <a
            className="btn btn-secondary btn-small"
            href={
              "mailto:" +
              (owner ? appointment.clientEmail : (provider?.email ?? ""))
            }
          >
            <Mail size={15} />
            Email {owner ? "client" : "professional"}
          </a>
          <a
            className="btn btn-secondary btn-small"
            href={
              "tel:" +
              (owner ? appointment.clientPhone : (provider?.phone ?? ""))
            }
          >
            <Phone size={15} />
            Call
          </a>
          <button
            className="btn btn-secondary btn-small"
            onClick={() =>
              downloadCalendar(appointment, service?.name, provider?.name)
            }
          >
            <CalendarPlus size={15} />
            Add to calendar
          </button>
        </div>
        {reschedule && (
          <div className="form-stack section-space">
            <Field label="New date">
              <input
                type="date"
                min={todayKey()}
                value={date}
                required
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
              />
            </Field>
            <Field label="Available time">
              <select
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                <option value="">
                  {slots.isLoading ? "Loading times…" : "Choose a time"}
                </option>
                {available.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            {slots.isError && (
              <p role="alert" className="form-error">
                Available times could not be loaded.
              </p>
            )}
            {slots.data && available.length === 0 && (
              <p className="small muted">
                No available times on this date. Choose another working day.
              </p>
            )}
            <div className="inline">
              <button
                className="btn btn-primary"
                disabled={!time || !service || mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    action: "reschedule",
                    data: {
                      appointmentDate: date,
                      startTime: time,
                      endTime: addMinutes(time, service!.duration),
                    },
                  })
                }
              >
                Save new time
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setReschedule(false)}
              >
                Keep current time
              </button>
            </div>
          </div>
        )}
        {confirmCancel && (
          <div className="notice section-space">
            <strong>Cancel this appointment?</strong>
            <p className="small">
              This releases the reserved time. The booking stays in your
              history.
            </p>
            <div className="inline">
              <button
                className="btn btn-danger"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: "cancel", data: {} })}
              >
                Confirm cancellation
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmCancel(false)}
              >
                Keep appointment
              </button>
            </div>
          </div>
        )}
        {mutation.error && (
          <p role="alert" className="form-error section-space">
            {mutation.error.message}
          </p>
        )}
        {active && !confirmCancel && !reschedule && (
          <div className="inline section-space">
            {owner && (
              <button
                className="btn btn-primary btn-small"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    action: "status",
                    data: { status: "completed" },
                  })
                }
              >
                <Check size={15} />
                Mark completed
              </button>
            )}
            {(owner || future) && (
              <>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => setReschedule(true)}
                >
                  <CalendarDays size={15} />
                  Reschedule
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => setConfirmCancel(true)}
                >
                  <X size={15} />
                  Cancel appointment
                </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
