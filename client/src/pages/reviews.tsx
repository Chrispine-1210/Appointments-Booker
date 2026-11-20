import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import type { Review, Provider } from "@shared/schema";
import {
  Avatar,
  PageHeader,
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/product-ui";
export default function Reviews() {
  const { providerId } = useParams<{ providerId: string }>();
  const query = useQuery<Review[]>({
    queryKey: [`/api/providers/${providerId}/reviews`],
  });
  const provider = useQuery<Provider>({
    queryKey: [`/api/providers/${providerId}`],
  });
  const reviews = query.data ?? [];
  return (
    <div className="public-container public-page prose-page">
      <PageHeader
        eyebrow={provider.data?.name ?? "Professional profile"}
        title="Published reviews"
        description="Feedback currently stored for this professional."
        actions={
          <Link href={"/book/" + providerId} className="btn btn-secondary">
            View booking page
          </Link>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : !reviews.length ? (
        <section className="card">
          <EmptyState
            icon={Star}
            title="A fresh page for feedback."
            description="No reviews are published for this professional. Review submission is not currently available."
          />
        </section>
      ) : (
        <div className="stack">
          {reviews.map((r) => (
            <article key={r.id} className="card card-body">
              <div className="spread">
                <div className="inline">
                  <Avatar name={r.clientName} />
                  <strong>{r.clientName}</strong>
                </div>
                <span
                  aria-label={r.rating + " out of 5 stars"}
                  className="inline"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={15}
                      fill={i < r.rating ? "#e7c77d" : "none"}
                      color="#c3a86d"
                    />
                  ))}
                </span>
              </div>
              {r.comment && (
                <p className="small muted section-space">{r.comment}</p>
              )}
              <time className="small muted">
                {r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "Africa/Blantyre",
                    })
                  : ""}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
