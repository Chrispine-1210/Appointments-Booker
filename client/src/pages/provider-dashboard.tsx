import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingTour } from "@/components/onboarding-tour";
import type { Appointment, Provider, Analytics } from "@shared/schema";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [runTour, setRunTour] = React.useState(false);

  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem("hasSeenOnboardingTour");
    if (!hasSeenTour) {
      setRunTour(true);
    }
  }, []);

  const handleTourFinish = () => {
    setRunTour(false);
    localStorage.setItem("hasSeenOnboardingTour", "true");
  };

  const { data: provider, isLoading: isLoadingProvider } = useQuery<Provider>({
    queryKey: ["/api/providers/1"],
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/analytics/1"],
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/providers/1/appointments", { date: today }],
  });

  if (isLoadingProvider || isLoadingAnalytics || isLoadingAppointments) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const displayName = provider ? `${provider.title} ${provider.name}`.trim() : (user as any)?.firstName || "Professional";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-accent text-white';
      case 'pending':
        return 'bg-amber-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'completed':
        return 'bg-slate-500 text-white';
      default:
        return 'bg-slate-300 text-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingTour run={runTour} onFinish={handleTourFinish} />
      <Navigation />
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1 space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden border border-slate-100">
              {/* Enhanced decorative background */}
              <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-primary opacity-[0.03] rounded-full blur-[100px] animate-pulse-slow"></div>
              
              {/* Dashboard Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 dashboard-welcome relative z-10">
                <div className="space-y-1">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome back, <span className="text-primary">{displayName}</span>
                  </h1>
                  <p className="text-slate-500 font-medium">
                    You have <span className="text-slate-900 font-bold">{appointments.length}</span> appointment{appointments.length !== 1 ? 's' : ''} scheduled for today.
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setRunTour(true)}
                    className="bg-primary/10 text-primary px-5 py-2.5 rounded-xl hover:bg-primary/20 transition-all font-bold text-sm flex items-center group onboarding-pulse shadow-sm active:scale-95"
                    title="Interactive Practice Guide"
                  >
                    <i className="fas fa-sparkles mr-2 group-hover:rotate-45 transition-transform duration-500"></i>
                    Tour
                  </button>
                  <Link href="/new-appointment" className="flex-1 sm:flex-none">
                    <button className="bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-secondary transition-all font-bold w-full flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95">
                      <i className="fas fa-plus mr-2"></i>
                      New
                    </button>
                  </Link>
                </div>
              </div>
              
              <div className="analytics-section relative z-10">
                <AnalyticsDashboard providerId={1} />
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden appointments-section relative z-10 border border-slate-100 transition-all hover:shadow-2xl">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Today's Schedule</h2>
                </div>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-primary/10">Live Feed</span>
              </div>
              
              {appointments.length === 0 ? (
                <div className="px-8 py-20 text-center text-slate-600 bg-white">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 shadow-inner">
                    <i className="fas fa-calendar-star text-4xl"></i>
                  </div>
                  <h3 className="font-black text-xl text-slate-800 mb-2">No Appointments</h3>
                  <p className="max-w-xs mx-auto text-slate-400 font-medium">Your schedule is clear for today. Great time to catch up on administration!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="px-8 py-6 hover:bg-slate-50/80 transition-all cursor-pointer group relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="text-sm font-black text-primary bg-primary/5 px-4 py-3 rounded-2xl min-w-[110px] text-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm border border-primary/5">
                            {appointment.startTime}
                          </div>
                          <div className="space-y-1">
                            <div className="text-base font-black text-slate-900 group-hover:text-primary transition-colors">
                              {appointment.clientName}
                            </div>
                            <div className="text-xs text-slate-400 font-bold flex items-center gap-2">
                              <i className="fas fa-phone text-[10px] opacity-50"></i>
                              {appointment.clientPhone || 'No phone'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <span className={`px-4 py-2 text-[10px] font-black rounded-full capitalize shadow-sm border ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:bg-primary/10 transition-all border border-transparent group-hover:border-primary/10">
                            <i className="fas fa-chevron-right text-sm"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Sidebar */}
          <div className="lg:w-80 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 sticky top-24">
              <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                <i className="fas fa-bolt text-primary"></i>
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Link href="/calendar">
                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-primary/5 hover:translate-x-1 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary shadow-sm">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Calendar</span>
                  </button>
                </Link>
                <Link href="/messages">
                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-primary/5 hover:translate-x-1 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary shadow-sm">
                      <i className="fas fa-comment-dots"></i>
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Messages</span>
                  </button>
                </Link>
                <Link href="/memos">
                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-primary/5 hover:translate-x-1 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary shadow-sm">
                      <i className="fas fa-sticky-note"></i>
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Memos</span>
                  </button>
                </Link>
                <Link href="/settings">
                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-primary/5 hover:translate-x-1 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary shadow-sm">
                      <i className="fas fa-sliders-h"></i>
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Settings</span>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Quick Stats/Tip */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <i className="fas fa-rocket text-6xl"></i>
              </div>
              <p className="text-primary font-black uppercase tracking-widest text-[10px] mb-2">Pro Tip</p>
              <p className="text-sm font-bold leading-relaxed opacity-90">
                Enable auto-confirm for "Standard Check-up" services in settings to save 15 minutes of scheduling daily.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
