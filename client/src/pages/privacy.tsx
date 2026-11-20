import { PageHeader } from "@/components/product-ui";
export default function Privacy() {
  return (
    <div className="public-container public-page prose-page">
      <PageHeader
        eyebrow="Your information"
        title="Privacy notice"
        description="How information is used in the current BookingPro application. Updated 20 November 2026."
      />
      <section className="card card-body">
        <h2>Account and appointment information</h2>
        <p>
          The app stores the name and email you use for your account, a
          protected password hash, your session, and the contact details and
          notes you submit with a booking. A professional can see the
          appointments booked with them, including the client details required
          to arrange the visit.
        </p>
        <h2>Public profiles</h2>
        <p>
          A professional's published name, title, specialty, biography, contact
          details, working hours and services are visible on their booking page
          and in the directory. Do not put private client information in a
          public profile or service description.
        </p>
        <h2>Private workspace records</h2>
        <p>
          Tasks and notes are scoped to the owning professional's account.
          Signed-in clients can access their own booking history. A guest
          confirmation uses the browser session that made the booking; keep a
          copy of the details if you will need them later.
        </p>
        <h2>Sessions and hosting</h2>
        <p>
          A session cookie keeps you signed in and protects guest booking
          access. Production cookies use Secure, HttpOnly and SameSite controls.
          The application is hosted on Vercel and stores records and sessions in
          Neon PostgreSQL. Request logs record request metadata rather than
          booking response bodies.
        </p>
        <h2>Contact and changes</h2>
        <p>
          Use your professional's contact details for questions about an
          appointment or the information provided for that service. Update your
          professional profile in Settings. Automated account erasure, email
          verification and self-service password recovery are not currently
          offered. There is no automatic deletion schedule presented by this
          application.
        </p>
      </section>
    </div>
  );
}
