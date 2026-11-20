import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/product-ui";
const topics = [
  {
    q: "How do I book an appointment?",
    a: "Open Find a professional, choose a profile, then select a service, working day and available time. Enter your contact details and confirm. You can book as a guest; signing in first also saves the appointment to your account history.",
  },
  {
    q: "Where is my confirmation?",
    a: "Your confirmation appears on screen immediately after booking. Save or print it, or download the appointment to your calendar. Guest confirmations are private to the browser session used to book. Automatic confirmation emails are not sent.",
  },
  {
    q: "Can I cancel or reschedule?",
    a: "If you booked while signed in, open My appointments, choose View & manage, then Cancel appointment or Reschedule. Available times are checked again when saving. For guest bookings or past appointments, contact the professional directly. Providers can manage appointments from their workspace.",
  },
  {
    q: "How do I start offering services?",
    a: "Create an account and select Offer services. Complete your professional profile, choose your working hours and publish your first service. You will receive a booking page to share with clients. An existing personal account can start this from Offer your services in its sidebar.",
  },
  {
    q: "How do I change my hours or prices?",
    a: "In your professional workspace, open Settings, then Working hours. Add or edit services under Services. Price changes apply to new bookings; existing booking values remain as recorded. Archived services stop accepting new bookings and preserve appointment history.",
  },
  {
    q: "How do payments work?",
    a: "Prices are displayed in Malawi kwacha (MWK). Online checkout is offered only when the professional has an authorized payment gateway configured. Otherwise, arrange payment directly with the professional. A gateway payment is verified by the server before it is recorded; bank payouts and refunds remain with the gateway. A booking value or pending payment is not evidence that money has been collected.",
  },
  {
    q: "What time zone does my appointment use?",
    a: "All appointments use Malawi time, Central Africa Time (CAT), UTC+02:00. Your calendar download includes the correct UTC time so calendar applications can display it in your own time zone.",
  },
  {
    q: "What happens if a time is already booked?",
    a: "That time will no longer appear as available. If another client reserves it while you are booking, the system rejects the overlap. Choose another available time and confirm again.",
  },
  {
    q: "Are email recovery and professional verification available?",
    a: "Password recovery is available through the Forgot password link when email delivery is configured. A reset link expires after 15 minutes and can be used once. Email ownership verification is separate. Keep your credentials secure. Profiles are self-published and do not prove professional qualifications; confirm those directly with the professional.",
  },
];
export default function Help() {
  const [search, setSearch] = useState("");
  const list = topics.filter((t) =>
    (t.q + " " + t.a).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="public-container public-page prose-page">
      <PageHeader
        eyebrow="A little guidance"
        title="How can we help?"
        description="Straightforward answers for booking and managing your working day."
      />
      <div
        className="search-wrap"
        style={{ maxWidth: "none", marginBottom: 30 }}
      >
        <Search size={17} />
        <input
          className="search-field"
          aria-label="Search help topics"
          placeholder="Search booking, services, availability…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <section className="card help-list">
        {list.length ? (
          list.map((t) => (
            <details key={t.q}>
              <summary>{t.q}</summary>
              <p>{t.a}</p>
            </details>
          ))
        ) : (
          <EmptyState
            icon={Search}
            title="No matching topics"
            description="Try a shorter phrase or a different search."
          />
        )}
      </section>
      <div className="notice section-space">
        <strong>Need to discuss an appointment?</strong> Your professional's
        contact details are on their booking page.{" "}
        <Link className="text-link" href="/contact">
          Find the right contact
        </Link>
      </div>
    </div>
  );
}
