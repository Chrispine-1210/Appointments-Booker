import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AccountGate } from "@/components/account-gate";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";

import Home from "@/pages/home";
import FindProviders from "@/pages/find-providers";
import ProviderDashboard from "@/pages/provider-dashboard";
import Booking from "@/pages/booking";
import NewAppointment from "@/pages/new-appointment";
import Memos from "@/pages/memos";
import Tasks from "@/pages/tasks";
import MyBookings from "@/pages/my-bookings";
import ProviderSettings from "@/pages/provider-settings";
import AppointmentConfirmation from "@/pages/appointment-confirmation";
import Reviews from "@/pages/reviews";
import Notifications from "@/pages/notifications";
import About from "@/pages/about";
import Help from "@/pages/help";
import Contact from "@/pages/contact";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Messages from "@/pages/messages";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) return <div role="alert" className="p-8 text-center">Unable to check your account. <button onClick={() => window.location.reload()} className="text-primary underline">Retry</button></div>;

  return (
    <div className="page-transition min-h-screen">
      <Switch>
        {/* Public routes */}
        <Route path="/">{user ? <AccountGate provider><ProviderDashboard /></AccountGate> : <Home />}</Route>
        <Route path="/login" component={Login} />
        <Route path="/onboarding"><AccountGate><Onboarding /></AccountGate></Route>
        <Route path="/find" component={FindProviders} />
        <Route path="/book/:providerId" component={Booking} />
        <Route path="/reviews/:providerId" component={Reviews} />
        <Route path="/confirmation/:appointmentId" component={AppointmentConfirmation} />
        <Route path="/about" component={About} />
        <Route path="/help" component={Help} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        
        {/* Protected routes - redirect to home if not authenticated */}
        <Route path="/dashboard">
          <AccountGate provider><ProviderDashboard /></AccountGate>
        </Route>
        <Route path="/new-appointment">
          <AccountGate provider><NewAppointment /></AccountGate>
        </Route>
        <Route path="/memos">
          <AccountGate provider><Memos /></AccountGate>
        </Route>
        <Route path="/tasks">
          <AccountGate provider><Tasks /></AccountGate>
        </Route>
        <Route path="/my-bookings">
          <AccountGate><MyBookings /></AccountGate>
        </Route>
        <Route path="/settings">
          <AccountGate provider><ProviderSettings /></AccountGate>
        </Route>
        <Route path="/notifications">
          <AccountGate><Notifications /></AccountGate>
        </Route>
        <Route path="/messages">
          <AccountGate><Messages /></AccountGate>
        </Route>
        <Route path="/calendar">
          <AccountGate><Calendar /></AccountGate>
        </Route>
        
        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
