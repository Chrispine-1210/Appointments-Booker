import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Check, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { Field } from "@/components/product-ui";
export default function Login() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const register = params.get("mode") === "register";
  const [intent, setIntent] = useState(
    params.get("intent") === "provider" ? "provider" : "client",
  );
  const [visible, setVisible] = useState(false);
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const { user } = useAuth();
  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const data = {
        email: form.get("email"),
        password: form.get("password"),
        ...(register
          ? { firstName: form.get("firstName"), lastName: form.get("lastName") }
          : {}),
      };
      await apiRequest(
        "POST",
        register ? "/api/auth/register" : "/api/auth/login",
        data,
      );
      const me: AuthUser = await (
        await apiRequest("GET", "/api/auth/user")
      ).json();
      return me;
    },
    onSuccess: async (me) => {
      await client.cancelQueries();
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/auth/user",
      });
      client.setQueryData(["/api/auth/user"], me);
      navigate(
        me.providerId
          ? "/dashboard"
          : register && intent === "provider"
            ? "/onboarding"
            : "/my-bookings",
      );
    },
  });
  useEffect(() => {
    setIntent(
      new URLSearchParams(search).get("intent") === "provider"
        ? "provider"
        : "client",
    );
    submit.reset();
  }, [search]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit.mutate(new FormData(e.currentTarget));
  };
  return (
    <div className="auth-grid">
      <aside className="auth-story">
        <span className="brand-symbol">
          <CalendarCheck2 />
        </span>
        <h1>
          A better day
          <br />
          starts here.
        </h1>
        <p>
          Your appointments, your clients, your next step. Bring it all together
          in one thoughtful workspace.
        </p>
        {[
          "Book available times with professionals",
          "Keep your appointments together",
          "Create a booking page for your business",
        ].map((t) => (
          <div className="auth-benefit" key={t}>
            <Check size={17} />
            {t}
          </div>
        ))}
      </aside>
      <section className="auth-panel">
        <p className="eyebrow">Your BookingPro account</p>
        <h2>{register ? "Make time for more." : "Welcome back."}</h2>
        <p>
          {register
            ? "Create an account and choose how you want to get started."
            : "Sign in to pick up where you left off."}
        </p>
        {user ? (
          <div className="notice">
            You are already signed in.{" "}
            <Link
              href={user.providerId ? "/dashboard" : "/my-bookings"}
              className="text-link"
            >
              Open your workspace
            </Link>
          </div>
        ) : (
          <>
            <form className="form-stack" onSubmit={onSubmit}>
              {register && (
                <>
                  <div
                    className="auth-tabs"
                    role="group"
                    aria-label="How will you use BookingPro?"
                  >
                    <button
                      type="button"
                      className={
                        "btn " +
                        (intent === "client" ? "btn-primary" : "btn-secondary")
                      }
                      onClick={() => setIntent("client")}
                    >
                      Book appointments
                    </button>
                    <button
                      type="button"
                      className={
                        "btn " +
                        (intent === "provider"
                          ? "btn-primary"
                          : "btn-secondary")
                      }
                      onClick={() => setIntent("provider")}
                    >
                      Offer services
                    </button>
                  </div>
                  <div className="form-grid">
                    <Field label="First name">
                      <input
                        name="firstName"
                        autoComplete="given-name"
                        required
                        maxLength={100}
                      />
                    </Field>
                    <Field label="Last name">
                      <input
                        name="lastName"
                        autoComplete="family-name"
                        required
                        maxLength={100}
                      />
                    </Field>
                  </div>
                </>
              )}
              <Field label="Email address">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  placeholder="you@example.com"
                />
              </Field>
              <Field
                label="Password"
                hint={
                  register
                    ? "Use at least 12 characters. A longer, unique phrase works well."
                    : undefined
                }
              >
                <span className="password-wrap">
                  <input
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    required
                    minLength={register ? 12 : 1}
                    maxLength={128}
                  />
                  <button
                    aria-label={visible ? "Hide password" : "Show password"}
                    type="button"
                    className="icon-button"
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </Field>
              {submit.error && (
                <p role="alert" className="form-error">
                  {submit.error.message}
                </p>
              )}
              <button disabled={submit.isPending} className="btn btn-primary">
                {submit.isPending
                  ? "Signing you in…"
                  : register
                    ? "Create account"
                    : "Sign in"}
              </button>
              {register && (
                <p className="small muted">
                  By creating an account, you agree to the{" "}
                  <Link href="/terms" className="text-link">
                    Terms
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/privacy" className="text-link">
                    Privacy notice
                  </Link>
                  .
                </p>
              )}
              {!register && (
                <Link href="/forgot-password" className="text-link">
                  Forgot your password?
                </Link>
              )}
            </form>
            <div className="auth-switch">
              {register ? "Already have an account?" : "New to BookingPro?"}{" "}
              <button
                className="text-link"
                onClick={() => {
                  navigate(
                    "/login?mode=" +
                      (register ? "login" : "register") +
                      "&intent=" +
                      intent,
                  );
                  submit.reset();
                }}
              >
                {register ? "Sign in" : "Create an account"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
