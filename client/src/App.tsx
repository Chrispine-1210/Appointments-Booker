import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AccountGate } from "@/components/account-gate";
import { Toaster } from "@/components/ui/toaster";
import { LoadingState } from "@/components/product-ui";
import AppLayout from "@/components/app-layout";
const Home = lazy(() => import("@/pages/home"));
const Login = lazy(() => import("@/pages/login"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const FindProviders = lazy(() => import("@/pages/find-providers"));
const ProviderDashboard = lazy(() => import("@/pages/provider-dashboard"));
const Booking = lazy(() => import("@/pages/booking"));
const NewAppointment = lazy(() => import("@/pages/new-appointment"));
const Memos = lazy(() => import("@/pages/memos"));
const Tasks = lazy(() => import("@/pages/tasks"));
const MyBookings = lazy(() => import("@/pages/my-bookings"));
const ProviderSettings = lazy(() => import("@/pages/provider-settings"));
const AppointmentConfirmation = lazy(
  () => import("@/pages/appointment-confirmation"),
);
const Reviews = lazy(() => import("@/pages/reviews"));
const Activity = lazy(() => import("@/pages/notifications"));
const About = lazy(() => import("@/pages/about"));
const Help = lazy(() => import("@/pages/help"));
const Contact = lazy(() => import("@/pages/contact"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Contacts = lazy(() => import("@/pages/messages"));
const Calendar = lazy(() => import("@/pages/calendar"));
const Services = lazy(() => import("@/pages/services"));
const Appointments = lazy(() => import("@/pages/appointments"));
const NotFound = lazy(() => import("@/pages/not-found"));
function AppRoutes() {
  return (
    <AppLayout>
      <Suspense fallback={<LoadingState label="Opening your page" />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/onboarding">
            <AccountGate>
              <Onboarding />
            </AccountGate>
          </Route>
          <Route path="/find" component={FindProviders} />
          <Route path="/book/:providerId" component={Booking} />
          <Route path="/reviews/:providerId" component={Reviews} />
          <Route
            path="/confirmation/:appointmentId"
            component={AppointmentConfirmation}
          />
          <Route path="/about" component={About} />
          <Route path="/help" component={Help} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/dashboard">
            <AccountGate provider>
              <ProviderDashboard />
            </AccountGate>
          </Route>
          <Route path="/appointments">
            <AccountGate provider>
              <Appointments />
            </AccountGate>
          </Route>
          <Route path="/services">
            <AccountGate provider>
              <Services />
            </AccountGate>
          </Route>
          <Route path="/new-appointment">
            <AccountGate provider>
              <NewAppointment />
            </AccountGate>
          </Route>
          <Route path="/memos">
            <AccountGate provider>
              <Memos />
            </AccountGate>
          </Route>
          <Route path="/tasks">
            <AccountGate provider>
              <Tasks />
            </AccountGate>
          </Route>
          <Route path="/my-bookings">
            <AccountGate>
              <MyBookings />
            </AccountGate>
          </Route>
          <Route path="/settings">
            <AccountGate provider>
              <ProviderSettings />
            </AccountGate>
          </Route>
          <Route path="/notifications">
            <AccountGate>
              <Activity />
            </AccountGate>
          </Route>
          <Route path="/messages">
            <AccountGate>
              <Contacts />
            </AccountGate>
          </Route>
          <Route path="/calendar">
            <AccountGate provider>
              <Calendar />
            </AccountGate>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppLayout>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
      <Toaster />
    </QueryClientProvider>
  );
}
