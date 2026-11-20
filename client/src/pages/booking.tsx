import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Clock3, Globe } from "lucide-react";
import type { Provider } from "@shared/schema";
import BookingForm from "@/components/booking-form";
import { Avatar, LoadingState, ErrorState } from "@/components/product-ui";
export default function Booking() {
  const { providerId } = useParams<{ providerId: string }>();
  const query = useQuery<Provider>({
    queryKey: [`/api/providers/${providerId}`],
    enabled: /^[1-9]\d*$/.test(providerId ?? ""),
  });
  const p = query.data;
  if (query.isLoading) return <LoadingState label="Opening booking page" />;
  return (
    <div className="public-container public-page">
      <div style={{ marginBottom: 25 }}>
        <Link href="/find" className="text-link">
          Back to professionals
        </Link>
      </div>
      {query.isError || !p || !p.isActive ? (
        <ErrorState
          message="This booking page is unavailable. Browse the directory to find another professional."
          retry={() => query.refetch()}
        />
      ) : (
        <div className="booking-layout">
          <aside className="booking-profile">
            <Avatar name={p.name} large />
            <h1>
              {p.title} {p.name}
            </h1>
            <p className="provider-specialty">{p.specialty}</p>
            {p.bio && <p>{p.bio}</p>}
            <div className="provider-meta">
              <Clock3 size={16} />
              {p.workingHours?.start} – {p.workingHours?.end} CAT
            </div>
            <a href={"mailto:" + p.email} className="provider-meta">
              <Mail size={16} />
              {p.email}
            </a>
            <a href={"tel:" + p.phone} className="provider-meta">
              <Phone size={16} />
              {p.phone}
            </a>
            {p.socialLinks?.website &&
              /^https?:\/\//.test(p.socialLinks.website) && (
                <a
                  href={p.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="provider-meta"
                >
                  <Globe size={16} />
                  Visit website
                </a>
              )}
            <Link href={"/reviews/" + p.id} className="text-link">
              View published reviews
            </Link>
          </aside>
          <section className="card">
            <BookingForm provider={p} />
          </section>
        </div>
      )}
    </div>
  );
}
