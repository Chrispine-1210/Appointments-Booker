import { Link } from "wouter";
import { CalendarDays, BriefcaseBusiness, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/product-ui";
export default function About() {
  return (
    <div className="public-container public-page">
      <PageHeader
        eyebrow="Built around your working day"
        title="Good work needs a little space."
        description="BookingPro helps independent professionals bring their services, appointments and daily organisation into one clear workspace."
      />
      <div className="three-columns">
        {[
          {
            icon: CalendarDays,
            title: "One place for your schedule",
            text: "A public booking page and a private calendar work together, so clients choose available times and you stay in control.",
          },
          {
            icon: BriefcaseBusiness,
            title: "Your practice, your details",
            text: "Publish your services, set prices in MWK, choose your hours and keep your public profile current.",
          },
          {
            icon: NotebookPen,
            title: "The rest of your day, too",
            text: "Keep client contacts, private notes and practical tasks near the appointments they support.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <article className="feature-card" key={title}>
            <Icon size={28} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <section className="public-cta section-space">
        <div>
          <h2>Give your next client a simpler way in.</h2>
          <p>Create your profile, add a service and share your booking page.</p>
        </div>
        <Link href="/login?mode=register&intent=provider" className="btn">
          Set up your business
        </Link>
      </section>
    </div>
  );
}
