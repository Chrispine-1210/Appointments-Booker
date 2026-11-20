import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Search, UsersRound } from "lucide-react";
import type { Provider } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useWorkspace";
import {
  Avatar,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/product-ui";
export default function Contacts() {
  const { providerId } = useAuth();
  const appointments = useAppointments();
  const providers = useQuery<Provider[]>({
    queryKey: ["/api/providers"],
    enabled: !providerId,
  });
  const [term, setTerm] = useState("");
  const contacts = new Map<
    string,
    { name: string; email: string; phone: string; count: number }
  >();
  for (const a of [...(appointments.data ?? [])].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  )) {
    const p = providers.data?.find((p) => p.id === a.providerId);
    const key = providerId ? a.clientEmail.toLowerCase() : String(a.providerId);
    const current = contacts.get(key);
    if (current) current.count++;
    else if (providerId || p)
      contacts.set(key, {
        name: providerId ? a.clientName : p!.name,
        email: providerId ? a.clientEmail : p!.email,
        phone: providerId ? a.clientPhone : p!.phone,
        count: 1,
      });
  }
  const list = [...contacts.values()].filter((c) =>
    (c.name + " " + c.email).toLowerCase().includes(term.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Keep the conversation simple"
        title={providerId ? "Client contacts" : "My contacts"}
        description={
          providerId
            ? "Contact details from your booked appointments. Email or call directly when you need to follow up."
            : "Reach the professionals you have booked with, using their public contact details."
        }
      />
      <div className="search-wrap" style={{ marginBottom: 25 }}>
        <Search size={17} />
        <input
          className="search-field"
          aria-label="Search contacts"
          placeholder="Find a name or email…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      {appointments.isLoading || (!providerId && providers.isLoading) ? (
        <LoadingState />
      ) : appointments.isError || (!providerId && providers.isError) ? (
        <ErrorState
          retry={() => {
            void appointments.refetch();
            void providers.refetch();
          }}
        />
      ) : !list.length ? (
        <section className="card">
          <EmptyState
            icon={UsersRound}
            title="Your connections start with a booking."
            description="Contacts appear here from your saved appointments. Try another search if you already have bookings."
          />
        </section>
      ) : (
        <div className="three-columns">
          {list.map((c) => (
            <article className="card contact-card" key={c.email}>
              <div className="inline">
                <Avatar name={c.name} />
                <div>
                  <h2 style={{ margin: 0 }}>{c.name}</h2>
                  <span className="small muted">
                    {c.count} appointment{c.count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <p>
                {c.email}
                <br />
                {c.phone}
              </p>
              <div className="inline">
                <a
                  className="btn btn-secondary btn-small"
                  href={"mailto:" + c.email}
                >
                  <Mail size={15} />
                  Email
                </a>
                <a
                  className="btn btn-secondary btn-small"
                  href={"tel:" + c.phone}
                >
                  <Phone size={15} />
                  Call
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="small muted section-space">
        Email and phone links open your device's apps. BookingPro does not send
        or store a conversation.
      </p>
    </>
  );
}
