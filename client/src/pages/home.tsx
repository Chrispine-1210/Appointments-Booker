import { Link } from "wouter";
import {
  CalendarDays,
  Clock3,
  Check,
  CalendarCheck2,
  BriefcaseBusiness,
  SlidersHorizontal,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
export default function Home() {
  return (
    <>
      <div className="public-container">
        <section className="hero">
          <div>
            <span className="hero-tag">
              <Sparkles size={13} />A little less admin. A lot more possibility.
            </span>
            <h1>
              Your time.
              <br />
              Better <span>booked.</span>
            </h1>
            <p className="hero-copy">
              A calmer way to book appointments and run your working day.
              Connect with professionals, manage your schedule, and make room
              for the work that matters.
            </p>
            <div className="hero-actions">
              <Link href="/find" className="btn btn-primary">
                Find a professional
              </Link>
              <Link
                href="/login?mode=register&intent=provider"
                className="btn btn-secondary"
              >
                Set up my business
              </Link>
            </div>
            <p className="hero-note">
              Book as a guest, or create an account to keep your appointments
              together.
            </p>
          </div>
          <div
            className="product-illustration"
            aria-label="Illustration of an example weekly schedule"
          >
            <div className="example-label">
              Your day, with a little more clarity · Example schedule
            </div>
            <div className="mini-window">
              <div className="mini-toolbar">
                <strong className="inline">
                  <CalendarDays size={17} />
                  Your week
                </strong>
                <span className="status-badge status-confirmed">Organised</span>
              </div>
              <div className="mini-calendar">
                {["MON", "TUE", "WED", "THU", "FRI"].map((d, i) => (
                  <div
                    className={"mini-day " + (i === 2 ? "current" : "")}
                    key={d}
                  >
                    {d}
                    <strong>{18 + i}</strong>
                  </div>
                ))}
              </div>
              <div className="mini-grid">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="mini-column">
                    {i !== 3 && (
                      <div
                        style={{
                          top: i % 2 ? 75 : 15,
                          height: i % 2 ? 78 : 65,
                        }}
                        className={
                          "mini-event " +
                          (i === 2 ? "green" : i === 4 ? "rose" : "")
                        }
                      >
                        <strong>
                          {i === 2
                            ? "Consultation"
                            : i === 4
                              ? "Planning"
                              : "Appointment"}
                        </strong>
                        <br />
                        {i % 2 ? "11:00 – 12:00" : "09:00 – 10:00"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-floating">
              <Check />
              <div>
                <strong>Everything has its place.</strong>
                <small>A booking page. A clear schedule. One workspace.</small>
              </div>
            </div>
          </div>
        </section>
        <div className="feature-strip">
          <div>
            <CalendarCheck2 size={23} />
            Book available times, in a few steps
          </div>
          <div>
            <Clock3 size={23} />
            Plan your day in Malawi time
          </div>
          <div>
            <ShieldCheck size={23} />
            Keep private records in your account
          </div>
        </div>
        <section className="marketing-section" id="how-it-works">
          <p className="eyebrow">A simpler working day</p>
          <h2>
            Less back and forth.
            <br />
            More moving forward.
          </h2>
          <p className="section-intro">
            Whether you need a professional or are ready to welcome your next
            client, your next step is simple.
          </p>
          <div className="three-columns">
            {[
              {
                icon: BriefcaseBusiness,
                title: "Make it yours",
                text: "Create your profile, add your services and prices, and choose the days and hours that work for you.",
              },
              {
                icon: Link2,
                title: "Share your booking page",
                text: "Give clients one place to choose a service and book an available time. Each appointment is saved in your schedule.",
              },
              {
                icon: SlidersHorizontal,
                title: "Take care of the details",
                text: "Manage appointments, client contacts, tasks and notes from a workspace built around your day.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="feature-card">
                <Icon size={28} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="public-cta">
          <div>
            <h2>Good work starts with a little space.</h2>
            <p>Give your appointments a home. Get your working day back.</p>
          </div>
          <Link href="/login?mode=register&intent=provider" className="btn">
            Create your booking page
          </Link>
        </section>
      </div>
    </>
  );
}
