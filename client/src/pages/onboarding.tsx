import { useState, type FormEvent } from "react";
import { useLocation, Redirect, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CalendarDays, BriefcaseBusiness } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { PageHeader, Field } from "@/components/product-ui";
export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const profile = {
        name: String(form.get("name")),
        title: String(form.get("title")),
        specialty: String(form.get("specialty")),
        email: String(form.get("email")),
        phone: String(form.get("phone")),
        bio: String(form.get("bio")),
        workingHours: {
          start: String(form.get("start")),
          end: String(form.get("end")),
          days: form.getAll("days").map(Number),
        },
      };
      const service = {
        name: String(form.get("serviceName")),
        description: String(form.get("serviceDescription")),
        duration: Number(form.get("duration")),
        price: String(form.get("price")),
      };
      return (
        await apiRequest("POST", "/api/providers/onboard", { profile, service })
      ).json();
    },
    onSuccess: async () => {
      await client.invalidateQueries();
      navigate("/dashboard");
    },
  });
  if (user?.providerId) return <Redirect to="/dashboard" />;
  const advance = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (step === 1) {
      const data = new FormData(form);
      if (
        !data.getAll("days").length ||
        String(data.get("start")) >= String(data.get("end"))
      ) {
        setError(
          "Choose at least one working day and a closing time after opening time.",
        );
        return;
      }
    }
    setError("");
    if (step < 2) setStep(step + 1);
    else submit.mutate(new FormData(form));
  };
  return (
    <div className="public-container public-page onboarding-page">
      <PageHeader
        eyebrow="Make it yours"
        title="Your next chapter, booked."
        description="Set up your public profile, working hours and first service. You can change these later in your workspace."
      />
      <div className="onboarding-steps">
        {["Your profile", "Working hours", "Your first service"].map((s, i) => (
          <span className={i === step ? "active" : ""} key={s}>
            {i < step ? "✓ " : ""}
            {s}
          </span>
        ))}
      </div>
      <form onSubmit={advance} className="card">
        <div className="card-body form-stack">
          <div hidden={step !== 0}>
            <h2 className="inline">
              <BriefcaseBusiness size={20} />
              Introduce your business
            </h2>
            <div className="form-stack section-space">
              <div className="form-grid">
                <Field label="Title (optional)">
                  <input
                    name="title"
                    maxLength={30}
                    placeholder="e.g. Dr., Ms., Mr."
                  />
                </Field>
                <Field label="Public name">
                  <input
                    name="name"
                    required={step === 0}
                    maxLength={200}
                    defaultValue={(
                      (user?.firstName ?? "") +
                      " " +
                      (user?.lastName ?? "")
                    ).trim()}
                  />
                </Field>
              </div>
              <Field label="Specialty">
                <input
                  name="specialty"
                  required={step === 0}
                  maxLength={200}
                  placeholder="e.g. Business consulting"
                />
              </Field>
              <div className="form-grid">
                <Field label="Public email">
                  <input
                    name="email"
                    type="email"
                    required={step === 0}
                    defaultValue={user?.email ?? ""}
                  />
                </Field>
                <Field label="Public phone">
                  <input
                    name="phone"
                    type="tel"
                    required={step === 0}
                    maxLength={40}
                    placeholder="+265…"
                  />
                </Field>
              </div>
              <Field label="About your practice (optional)">
                <textarea
                  name="bio"
                  maxLength={3000}
                  placeholder="Tell clients what you do and how you can help."
                />
              </Field>
            </div>
          </div>
          <div hidden={step !== 1}>
            <h2 className="inline">
              <CalendarDays size={20} />
              Make your availability clear
            </h2>
            <p className="small muted">
              All times use Malawi time (CAT, UTC+02:00).
            </p>
            <div className="form-grid section-space">
              <Field label="Opening time">
                <input
                  name="start"
                  type="time"
                  defaultValue="09:00"
                  required={step === 1}
                />
              </Field>
              <Field label="Closing time">
                <input
                  name="end"
                  type="time"
                  defaultValue="17:00"
                  required={step === 1}
                />
              </Field>
            </div>
            <p className="field section-space">Working days</p>
            <div className="day-picker">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, i) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      name="days"
                      value={i}
                      defaultChecked={i > 0 && i < 6}
                    />
                    <span>{day}</span>
                  </label>
                ),
              )}
            </div>
            <p className="notice section-space">
              Only times within these hours are offered to clients. Existing
              appointments automatically block overlapping times.
            </p>
          </div>
          <div hidden={step !== 2}>
            <h2>Your first bookable service</h2>
            <p className="small muted">
              Help clients know what to expect. Prices are shown in Malawi
              kwacha.
            </p>
            <div className="form-stack section-space">
              <Field label="Service name">
                <input
                  name="serviceName"
                  required={step === 2}
                  maxLength={200}
                  placeholder="Initial consultation"
                />
              </Field>
              <Field label="Description (optional)">
                <textarea
                  name="serviceDescription"
                  maxLength={2000}
                  placeholder="What's included in this appointment?"
                />
              </Field>
              <div className="form-grid">
                <Field label="Duration in minutes">
                  <input
                    name="duration"
                    type="number"
                    min={1}
                    max={720}
                    defaultValue={30}
                    required={step === 2}
                  />
                </Field>
                <Field label="Price (MWK)">
                  <input
                    name="price"
                    type="number"
                    min={0}
                    max={99999999.99}
                    step="0.01"
                    required={step === 2}
                  />
                </Field>
              </div>
            </div>
          </div>
          {(error || submit.error) && (
            <p className="form-error" role="alert">
              {error || submit.error?.message}
            </p>
          )}
          <div className="spread">
            <div>
              {step > 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              ) : (
                <Link href="/my-bookings" className="text-link">
                  Set up later
                </Link>
              )}
            </div>
            <button className="btn btn-primary" disabled={submit.isPending}>
              {submit.isPending ? (
                "Creating your page…"
              ) : step === 2 ? (
                <>
                  <Check size={17} />
                  Create booking page
                </>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
