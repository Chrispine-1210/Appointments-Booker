import Navigation from "@/components/navigation";
import { Link } from "wouter";
export default function Notifications() {
  return <div className="min-h-screen bg-slate-50"><Navigation /><main className="mx-auto max-w-3xl px-5 py-12"><h1 className="mb-6 text-3xl font-bold">Notifications</h1><div className="rounded-2xl border bg-white p-8"><p className="text-slate-600">Automatic notifications are not enabled. Check your booking details for your confirmed appointment times.</p><Link href="/my-bookings" className="mt-5 inline-block font-semibold text-primary">View my bookings</Link></div></main></div>;
}
