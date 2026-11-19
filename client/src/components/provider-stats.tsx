import { sumAmounts } from "@shared/money";
import { useAuth } from "@/hooks/useAuth";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Appointment } from "@shared/schema";

export default function ProviderStats() {
  const { providerId } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { data: allAppointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/providers/${providerId}/appointments`],
    enabled: !!providerId,
  });

  const { data: todayAppointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/providers/${providerId}/appointments`, { date: today }],
    enabled: !!providerId,
  });

  const weekStart = format(new Date(Date.now() - 6 * 86400000), 'yyyy-MM-dd');
  const thisWeek = allAppointments.filter(a => a.appointmentDate >= weekStart && a.appointmentDate <= today).length;
  const revenue = sumAmounts(allAppointments.filter(a => a.paymentStatus === 'completed').map(a => a.paymentAmount));
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
      label: "Collections",
      value: `MWK ${revenue}`,
      icon: "fas fa-dollar-sign", 
      color: "text-amber-500"
    },
    {
      label: "Cancelled",
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
