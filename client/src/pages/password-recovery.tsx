import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Field } from "@/components/product-ui";
import { apiRequest } from "@/lib/queryClient";
export default function PasswordRecovery() {
  const [path] = useLocation(),
    reset = path === "/reset-password";
  const [token] = useState(() => window.location.hash.slice(1));
  const client = useQueryClient();
  useEffect(() => {
    if (reset) {
      window.history.replaceState(null, "", window.location.pathname);
      document.title = "Reset password · BookingPro";
    }
  }, [reset]);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (reset && form.get("password") !== form.get("confirm"))
        throw new Error("Passwords must match.");
      return (
        await apiRequest(
          "POST",
          reset ? "/api/auth/reset-password" : "/api/auth/forgot-password",
          reset
            ? { token, password: form.get("password") }
            : { email: form.get("email") },
        )
      ).json();
    },
    onSuccess: async () => {
      if (reset) {
        await client.cancelQueries();
        client.clear();
      }
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(new FormData(e.currentTarget));
  };
  return (
    <section className="page-narrow section-space">
      <div
        className="card card-body"
        style={{ maxWidth: 550, margin: "40px auto" }}
      >
        <p className="eyebrow">Account security</p>
        <h1>{reset ? "Choose a new password" : "Forgot your password?"}</h1>
        <p className="muted">
          {reset
            ? "Your existing sign-in sessions will be signed out."
            : "Enter your sign-in email to request a private reset link."}
        </p>
        {mutation.isSuccess ? (
          <div className="notice" role="status">
            {mutation.data.message}
          </div>
        ) : reset && !/^[a-f0-9]{64}$/.test(token) ? (
          <div className="notice">
            This link is missing its security token.{" "}
            <Link className="text-link" href="/forgot-password">
              Request a new link
            </Link>
            .
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            {reset ? (
              <>
                <Field label="New password" hint="At least 12 characters.">
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </Field>
              </>
            ) : (
              <Field label="Sign-in email">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  required
                />
              </Field>
            )}
            {mutation.error && (
              <p className="form-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <button className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Please wait…"
                : reset
                  ? "Save new password"
                  : "Send reset link"}
            </button>
          </form>
        )}
        <p className="section-space">
          <Link className="text-link" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
