import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, BriefcaseBusiness, CalendarDays, Star } from "lucide-react";
import type { Provider } from "@shared/schema";
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  Field,
} from "@/components/product-ui";
export default function FindProviders() {
  const [search, setSearch] = useState(
    new URLSearchParams(window.location.search).get("q") ?? "",
  );
  const [specialty, setSpecialty] = useState("");
  const query = useQuery<Provider[]>({ queryKey: ["/api/providers"] });
  const providers = query.data ?? [];
  const filtered = providers.filter(
    (p) =>
      (p.name + " " + p.specialty + " " + (p.bio ?? ""))
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!specialty || p.specialty === specialty),
  );
  return (
    <div className="public-container" style={{ paddingBottom: 70 }}>
      <header className="directory-header">
        <p className="eyebrow">A good fit for your next step</p>
        <h1>Find your professional.</h1>
        <p>
          Explore available professionals and choose a service and time that
          work for you.
        </p>
      </header>
      <section className="card directory-filters">
        <Field label="Name or specialty">
          <span className="search-wrap" style={{ maxWidth: "none" }}>
            <Search size={17} />
            <input
              aria-label="Search professionals"
              className="search-field"
              placeholder="Who can help you today?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </span>
        </Field>
        <Field label="Specialty">
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="">All specialties</option>
            {[...new Set(providers.map((p) => p.specialty))].sort().map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setSearch("");
            setSpecialty("");
          }}
        >
          Clear filters
        </button>
      </section>
      {query.isLoading ? (
        <LoadingState label="Finding professionals" />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : !filtered.length ? (
        <section className="card">
          <EmptyState
            icon={BriefcaseBusiness}
            title={
              providers.length
                ? "No matches just yet."
                : "A growing space for professionals."
            }
            description={
              providers.length
                ? "Try another name or specialty, or clear your filters."
                : "Professionals will appear here after creating a booking page. If you offer a service, this is a good place to start."
            }
            action={
              providers.length ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setSpecialty("");
                  }}
                >
                  Reset search
                </button>
              ) : (
                <Link
                  href="/login?mode=register&intent=provider"
                  className="btn btn-primary"
                >
                  Create your booking page
                </Link>
              )
            }
          />
        </section>
      ) : (
        <>
          <p className="small muted" style={{ marginBottom: 20 }}>
            {filtered.length} professional{filtered.length === 1 ? "" : "s"}{" "}
            available to explore
          </p>
          <div className="three-columns">
            {filtered.map((p) => (
              <article className="card provider-card" key={p.id}>
                <div className="card-body">
                  <div className="spread">
                    <Avatar name={p.name} large />
                    {Number(p.reviewCount) > 0 && (
                      <Link className="provider-meta" href={"/reviews/" + p.id}>
                        <Star size={14} />
                        {p.rating} · {p.reviewCount} reviews
                      </Link>
                    )}
                  </div>
                  <div>
                    <h2>
                      {p.title} {p.name}
                    </h2>
                    <span className="provider-specialty">{p.specialty}</span>
                  </div>
                  <p className="provider-bio">
                    {p.bio ||
                      "View this professional’s services and available appointment times."}
                  </p>
                  <div className="provider-meta">
                    <CalendarDays size={15} />
                    {p.workingHours
                      ? p.workingHours.start +
                        " – " +
                        p.workingHours.end +
                        " CAT"
                      : "View availability"}
                  </div>
                  <Link className="btn btn-primary" href={"/book/" + p.id}>
                    View services & book
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <p className="small muted section-space">
        Profiles are provided by professionals. Confirm qualifications and
        service details directly before your visit.
      </p>
    </div>
  );
}
