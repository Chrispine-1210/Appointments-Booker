import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  const { user, isLoading } = useAuth();

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

  return (
    <div className="page-transition min-h-screen">
      <Switch>
        {/* Public routes */}
        <Route path="/" component={user ? ProviderDashboard : Home} />
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
          {user ? <ProviderDashboard /> : <Home />}
        </Route>
        <Route path="/new-appointment">
          {user ? <ProviderDashboard /> : <Home />}
        </Route>
        <Route path="/memos">
          {user ? <Memos /> : <Home />}
        </Route>
        <Route path="/tasks">
          {user ? <Tasks /> : <Home />}
        </Route>
        <Route path="/my-bookings">
          {user ? <MyBookings /> : <Home />}
        </Route>
        <Route path="/settings">
          {user ? <ProviderSettings /> : <Home />}
        </Route>
        <Route path="/notifications">
          {user ? <Notifications /> : <Home />}
        </Route>
        <Route path="/messages">
          {user ? <Messages /> : <Home />}
        </Route>
        <Route path="/calendar">
          {user ? <Calendar /> : <Home />}
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
    </QueryClientProvider>
  );
}

export default App;
