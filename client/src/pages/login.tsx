import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";

export default function Login() {
  const [register, setRegister] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const data = { email: form.get("email"), password: form.get("password"), ...(register ? { firstName: form.get("firstName"), lastName: form.get("lastName") } : {}) };
      return (await apiRequest("POST", register ? "/api/auth/register" : "/api/auth/login", data)).json();
    },
    onSuccess: async () => {
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ["/api/auth/user"], queryFn: async () => (await apiRequest("GET", "/api/auth/user")).json() });
      navigate("/dashboard");
    },
  });
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submit.mutate(new FormData(event.currentTarget)); };
  return <div className="min-h-screen bg-slate-50"><Navigation /><main className="mx-auto max-w-md px-5 py-12">
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">BookingPro</p>
      <h1 className="text-3xl font-bold text-slate-900">{register ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-3 mb-7 text-slate-600">{register ? "Set up your professional profile and start accepting appointments." : "Sign in to manage your schedule and bookings."}</p>
      {user && <p className="mb-4 text-sm">You are signed in. <Link href="/dashboard" className="text-primary underline">Open dashboard</Link></p>}
      <form onSubmit={onSubmit} className="space-y-4">
        {register && <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">First name<input name="firstName" autoComplete="given-name" required maxLength={100} className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm font-medium">Last name<input name="lastName" autoComplete="family-name" required maxLength={100} className="mt-1 w-full rounded-lg border p-3" /></label></div>}
        <label className="block text-sm font-medium">Email address<input name="email" type="email" autoComplete="email" required maxLength={320} className="mt-1 w-full rounded-lg border p-3" /></label>
        <label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} className="mt-1 w-full rounded-lg border p-3" /></label>
        {register && <p className="text-xs text-slate-500">Use at least 12 characters.</p>}
        {submit.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{submit.error.message}</p>}
        <button disabled={submit.isPending} className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{submit.isPending ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      <button onClick={() => { setRegister(!register); submit.reset(); }} className="mt-6 w-full text-sm font-medium text-primary">{register ? "Already have an account? Sign in" : "New here? Create an account"}</button>
    </div>
  </main></div>;
}
