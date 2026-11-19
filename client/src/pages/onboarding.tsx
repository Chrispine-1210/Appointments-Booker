import { type FormEvent } from "react";
import { useLocation, Redirect } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const profile = { name: String(form.get("name")), specialty: String(form.get("specialty")), email: String(form.get("email")), phone: String(form.get("phone")),
        workingHours: { start: String(form.get("start")), end: String(form.get("end")), days: form.getAll("days").map(Number) } };
      const service = { name: String(form.get("serviceName")), duration: Number(form.get("duration")), price: String(form.get("price")) };
      return (await apiRequest("POST", "/api/providers/onboard", { profile, service })).json();
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); await queryClient.invalidateQueries({ queryKey: ["/api/providers"] }); navigate("/dashboard"); },
  });
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submit.mutate(new FormData(event.currentTarget)); };
  if (user?.providerId) return <Redirect to="/dashboard" />;
  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-3";
  return <div className="min-h-screen bg-slate-50"><Navigation /><main className="mx-auto max-w-2xl px-5 py-10">
    <h1 className="text-3xl font-bold text-slate-900">Set up your booking page</h1><p className="mt-3 mb-7 text-slate-600">Add your professional details, opening hours and first service. Times use Malawi local time.</p>
    <form onSubmit={onSubmit} className="space-y-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <fieldset className="space-y-4"><legend className="mb-3 text-lg font-semibold">Professional profile</legend>
        <label className="block text-sm font-medium">Public name<input name="name" required maxLength={200} defaultValue={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()} className={input} /></label>
        <label className="block text-sm font-medium">Specialty<input name="specialty" required maxLength={200} placeholder="e.g. Business consulting" className={input} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Public email<input name="email" type="email" required maxLength={320} defaultValue={user?.email ?? ""} className={input} /></label><label className="block text-sm font-medium">Phone<input name="phone" type="tel" required maxLength={40} className={input} /></label></div>
      </fieldset>
      <fieldset><legend className="mb-3 text-lg font-semibold">Opening hours</legend><div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium">Opens<input name="start" type="time" required defaultValue="09:00" className={input} /></label><label className="text-sm font-medium">Closes<input name="end" type="time" required defaultValue="17:00" className={input} /></label></div>
        <div className="mt-4 flex flex-wrap gap-4">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label key={day} className="flex items-center gap-2 text-sm"><input name="days" type="checkbox" value={index} defaultChecked={index > 0 && index < 6} />{day}</label>)}</div>
      </fieldset>
      <fieldset className="space-y-4"><legend className="mb-3 text-lg font-semibold">First bookable service</legend><label className="block text-sm font-medium">Service name<input name="serviceName" required maxLength={200} placeholder="Initial consultation" className={input} /></label><div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium">Duration (minutes)<input name="duration" type="number" min={1} max={720} required defaultValue={30} className={input} /></label><label className="text-sm font-medium">Price (MWK)<input name="price" type="number" min={0} max={99999999.99} step="0.01" required className={input} /></label></div></fieldset>
      {submit.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{submit.error.message}</p>}
      <button disabled={submit.isPending} className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{submit.isPending ? "Saving your page…" : "Create booking page"}</button>
    </form>
  </main></div>;
}
