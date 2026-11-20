import { useState } from "react";
import { Link } from "wouter";
import {
  CalendarDays,
  UsersRound,
  Wallet,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Check,
} from "lucide-react";
import type { Appointment } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import {
  useAppointments,
  useProvider,
  useServices,
  useTasks,
} from "@/hooks/useWorkspace";
import { PageHeader, LoadingState, ErrorState } from "@/components/product-ui";
import { AppointmentTable } from "@/components/appointment-table";
import { AppointmentDetails } from "@/components/appointment-details";
import { MiniMonth } from "@/components/mini-month";
import { money, prettyDate, todayKey } from "@/lib/booking-utils";
import { useToast } from "@/hooks/use-toast";
export default function ProviderDashboard() {
  const { user, providerId } = useAuth();
  const { data: provider } = useProvider();
  const query = useAppointments();
  const { data: services = [] } = useServices();
  const { data: tasks = [] } = useTasks();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [copied, setCopied] = useState(false);
  const today = todayKey();
  const all = query.data ?? [];
  const todays = all
    .filter((a) => a.appointmentDate === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const booked = all.filter((a) => a.status !== "cancelled");
  const collected = all
    .filter((a) => a.paymentStatus === "completed")
    .reduce((sum, a) => sum + Number(a.paymentAmount ?? 0), 0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + "/book/" + providerId,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy your booking link",
        description: window.location.origin + "/book/" + providerId,
      });
    }
  };
  return (
    <>
      <PageHeader
        eyebrow={prettyDate(today)}
        title={"Hello, " + (user?.firstName ?? "there") + "."}
        description="Here's a little clarity for the day ahead."
        actions={
          <Link href="/calendar" className="btn btn-secondary">
            <CalendarDays size={17} />
            View calendar
          </Link>
        }
      />
      <div className="dashboard-welcome">
        <div>
          <h2>
            {provider?.name ?? "Your practice"}, ready for your next client.
          </h2>
          <p>Your personal booking page makes finding a time simple.</p>
        </div>
        <button className="btn btn-small" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Link copied" : "Copy booking link"}
        </button>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "Today's appointments",
            value: todays.filter((a) => a.status !== "cancelled").length,
            note: "Scheduled in Malawi time",
            icon: CalendarDays,
          },
          {
            label: "Clients booked",
            value: new Set(booked.map((a) => a.clientEmail.toLowerCase())).size,
            note: "Unique emails across your bookings",
            icon: UsersRound,
          },
          {
            label: "Recorded collections",
            value: money(collected),
            note: "Only records marked paid",
            icon: Wallet,
          },
          {
            label: "Completed appointments",
            value: all.filter((a) => a.status === "completed").length,
            note: "Across your appointment history",
            icon: CheckCircle2,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <div className="card stat-card" key={label}>
            <div className="stat-label">
              {label}
              <Icon />
            </div>
            <div className="stat-number">{query.isLoading ? "—" : value}</div>
            <div className="stat-foot">{note}</div>
          </div>
        ))}
      </div>
      <div className="split">
        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Today's appointments</h2>
                <p>{prettyDate(today)} · Your day at a glance</p>
              </div>
              <Link href="/appointments" className="text-link">
                View all
              </Link>
            </div>
            {query.isLoading ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState retry={() => query.refetch()} />
            ) : (
              <AppointmentTable
                appointments={todays}
                services={services}
                onSelect={setSelected}
                emptyAction={
                  <Link
                    href="/new-appointment"
                    className="btn btn-secondary btn-small"
                  >
                    <Plus size={15} />
                    Add an appointment
                  </Link>
                }
              />
            )}
          </section>
          <section className="card">
            <div className="card-header">
              <h2>A little less on your mind</h2>
              <Link href="/tasks" className="text-link">
                Your tasks
              </Link>
            </div>
            <div className="card-body">
              <p className="small muted">
                {tasks.filter((t) => t.status !== "completed").length
                  ? tasks.filter((t) => t.status !== "completed").length +
                    " open tasks are waiting for your attention."
                  : "No open tasks. You have a little breathing room."}
              </p>
              <div className="inline">
                <Link href="/tasks" className="btn btn-secondary btn-small">
                  Manage tasks
                </Link>
                <Link href="/memos" className="btn btn-quiet btn-small">
                  Open notes
                </Link>
              </div>
            </div>
          </section>
        </div>
        <aside className="stack">
          <section className="card">
            <MiniMonth
              selected={today}
              onSelect={() => {
                window.location.assign("/calendar");
              }}
            />
          </section>
          <section className="card">
            <div className="card-body">
              <p className="eyebrow">Your booking page</p>
              <h2>Open for business.</h2>
              <p className="small muted">
                Preview your profile and services exactly as a client sees them.
              </p>
              <Link
                className="btn btn-secondary btn-small"
                href={"/book/" + providerId}
              >
                <ExternalLink size={15} />
                Preview page
              </Link>
            </div>
          </section>
        </aside>
      </div>
      {selected && (
        <AppointmentDetails
          appointment={selected}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
