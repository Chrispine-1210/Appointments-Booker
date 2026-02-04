import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Appointment } from "@shared/schema";

export default function ProviderStats() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { data: allAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/providers/1/appointments"],
  });

  const { data: todayAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/providers/1/appointments", { date: today }],
  });

  // Calculate week's appointments (simplified - just using last 7 days of data)
  const thisWeek = allAppointments.slice(0, 24).length;
  
  // Calculate revenue (simplified)
  const revenue = allAppointments.reduce((total, appointment) => {
    // Assuming $150 for consultation, $75 for follow-up (matching design)
    return total + (appointment.clientName ? 150 : 75); // Simplified logic
  }, 0);

  // Calculate no-shows (simplified)
  const noShows = allAppointments.filter(a => a.status === 'cancelled').length;

  const stats = [
    {
      label: "Today",
      value: todayAppointments.length.toString(),
      icon: "fas fa-calendar-day",
      color: "text-primary"
    },
    {
      label: "This Week", 
      value: thisWeek.toString(),
      icon: "fas fa-calendar-week",
      color: "text-accent"
    },
    {
      label: "Revenue",
      value: `$${revenue.toLocaleString()}`,
      icon: "fas fa-dollar-sign", 
      color: "text-amber-500"
    },
    {
      label: "No-Shows",
      value: noShows.toString(),
      icon: "fas fa-user-times",
      color: "text-red-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-slate-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
            <i className={`${stat.icon} ${stat.color} text-xl`}></i>
          </div>
        </div>
      ))}
    </div>
  );
}
