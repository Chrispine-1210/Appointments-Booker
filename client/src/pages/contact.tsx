import { Link } from "wouter";
import { CalendarDays, UsersRound, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/product-ui";
import { useAuth } from "@/hooks/useAuth";
export default function Contact() {
  const { user } = useAuth();
  return (
    <div className="public-container public-page">
      <PageHeader
        eyebrow="Get to the right person"
        title="Let's keep you connected."
        description="For a question about your visit, your professional is the best place to start."
      />
      <div className="three-columns">
        <article className="feature-card">
          <CalendarDays size={28} />
          <h2>About an appointment</h2>
          <p>
            Open your appointment to find your professional's email and phone.
            Discuss preparation, service details or a change to your visit
            directly.
          </p>
          <Link
            className="btn btn-secondary section-space"
            href={user ? "/my-bookings" : "/login"}
          >
            My appointments
          </Link>
        </article>
        <article className="feature-card">
          <UsersRound size={28} />
          <h2>Find a professional</h2>
          <p>
            Every public booking page includes the contact details supplied by
            that professional. Search the directory to find their profile.
          </p>
          <Link className="btn btn-secondary section-space" href="/find">
            Browse professionals
          </Link>
        </article>
        <article className="feature-card">
          <HelpCircle size={28} />
          <h2>Using BookingPro</h2>
          <p>
            Find guidance on booking, availability, managing services and your
            account in the help centre.
          </p>
          <Link className="btn btn-secondary section-space" href="/help">
            Open help centre
          </Link>
        </article>
      </div>
    </div>
  );
}
