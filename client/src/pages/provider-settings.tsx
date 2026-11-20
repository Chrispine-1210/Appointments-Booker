import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ShieldCheck, Save } from "lucide-react";
import { useProvider } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  PageHeader,
  Field,
  Avatar,
  LoadingState,
  ErrorState,
} from "@/components/product-ui";
export default function ProviderSettings() {
  const query = useProvider();
  const p = query.data;
  const { user, providerId } = useAuth();
  const client = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState("Profile");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: async (data: unknown) =>
      (await apiRequest("PATCH", "/api/providers/" + providerId, data)).json(),
    onSuccess: async () => {
      await client.invalidateQueries();
      toast({
        title: "Settings saved",
        description: "Your booking page has been updated.",
      });
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    if (tab === "Working hours") {
      const hours = {
        start: String(f.get("start")),
        end: String(f.get("end")),
        days: f.getAll("days").map(Number),
      };
      if (!hours.days.length || hours.end <= hours.start) {
        setError("Choose a working day and a closing time after opening.");
        return;
      }
      mutation.mutate({ workingHours: hours });
    } else {
      const website = String(f.get("website"));
      mutation.mutate({
        name: String(f.get("name")),
        title: String(f.get("title")),
        specialty: String(f.get("specialty")),
        email: String(f.get("email")),
        phone: String(f.get("phone")),
        bio: String(f.get("bio")),
        socialLinks: { ...p?.socialLinks, website },
      });
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Make it work for you"
        title="Settings"
        description="Your public profile, availability and account information."
        actions={
          <Link href={"/book/" + providerId} className="btn btn-secondary">
            <ExternalLink size={17} />
            View booking page
          </Link>
        }
      />
      <div className="segmented" style={{ marginBottom: 25 }}>
        {["Profile", "Working hours", "Account"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setError("");
              mutation.reset();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !p ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <section className="card" style={{ maxWidth: 850 }}>
          <div className="card-header">
            <div>
              <h2>
                {tab === "Profile"
                  ? "Your professional profile"
                  : tab === "Working hours"
                    ? "When clients can book"
                    : "Your account"}
              </h2>
              <p>
                {tab === "Account"
                  ? "Sign-in details are separate from your public profile."
                  : "Changes appear on your public booking page."}
              </p>
            </div>
            {tab === "Profile" && <Avatar name={p.name} />}
          </div>
          <div className="card-body">
            {tab === "Account" ? (
              <div className="form-stack">
                <dl className="detail-grid">
                  <div>
                    <dt>Name</dt>
                    <dd>
                      {user?.firstName} {user?.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt>Sign-in email</dt>
                    <dd>{user?.email}</dd>
                  </div>
                  <div>
                    <dt>Account type</dt>
                    <dd>Professional</dd>
                  </div>
                  <div>
                    <dt>Time zone</dt>
                    <dd>Africa/Blantyre · CAT</dd>
                  </div>
                </dl>
                <div className="notice inline">
                  <ShieldCheck size={23} />
                  <span>
                    Keep your password private. Sign out using the account
                    control in the sidebar when using a shared device.
                  </span>
                </div>
                <p className="small muted">
                  Email verification and self-service password recovery are not
                  available yet. Changing your public contact email does not
                  change your sign-in email.
                </p>
              </div>
            ) : (
              <form className="form-stack" key={tab} onSubmit={submit}>
                {tab === "Profile" ? (
                  <>
                    <div className="form-grid">
                      <Field label="Title (optional)">
                        <input
                          name="title"
                          maxLength={30}
                          defaultValue={p.title ?? ""}
                        />
                      </Field>
                      <Field label="Public name">
                        <input
                          name="name"
                          required
                          maxLength={200}
                          defaultValue={p.name}
                        />
                      </Field>
                    </div>
                    <Field label="Specialty">
                      <input
                        name="specialty"
                        required
                        maxLength={200}
                        defaultValue={p.specialty}
                      />
                    </Field>
                    <div className="form-grid">
                      <Field label="Public email">
                        <input
                          name="email"
                          type="email"
                          required
                          defaultValue={p.email}
                        />
                      </Field>
                      <Field label="Public phone">
                        <input
                          name="phone"
                          type="tel"
                          required
                          maxLength={40}
                          defaultValue={p.phone}
                        />
                      </Field>
                    </div>
                    <Field label="About your practice">
                      <textarea
                        name="bio"
                        maxLength={3000}
                        defaultValue={p.bio ?? ""}
                      />
                    </Field>
                    <Field label="Website (optional)">
                      <input
                        name="website"
                        type="url"
                        placeholder="https://…"
                        defaultValue={p.socialLinks?.website ?? ""}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <p className="small muted">
                      Appointment times use Malawi local time (CAT). Only your
                      chosen working days and hours can be booked.
                    </p>
                    <div className="form-grid">
                      <Field label="Opens">
                        <input
                          name="start"
                          type="time"
                          required
                          defaultValue={p.workingHours?.start ?? "09:00"}
                        />
                      </Field>
                      <Field label="Closes">
                        <input
                          name="end"
                          type="time"
                          required
                          defaultValue={p.workingHours?.end ?? "17:00"}
                        />
                      </Field>
                    </div>
                    <span className="field">Working days</span>
                    <div className="day-picker">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d, i) => (
                          <label key={d}>
                            <input
                              name="days"
                              type="checkbox"
                              value={i}
                              defaultChecked={p.workingHours?.days.includes(i)}
                            />
                            <span>{d}</span>
                          </label>
                        ),
                      )}
                    </div>
                    <div className="notice">
                      Changing hours affects newly available times. Appointments
                      already booked remain in your calendar.
                    </div>
                  </>
                )}
                {(error || mutation.error) && (
                  <p role="alert" className="form-error">
                    {error || mutation.error?.message}
                  </p>
                )}
                <div>
                  <button
                    className="btn btn-primary"
                    disabled={mutation.isPending}
                  >
                    <Save size={16} />
                    {mutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
