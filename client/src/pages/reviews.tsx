import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import Navigation from "@/components/navigation";
import type { Review } from "@shared/schema";

export default function Reviews() {
  const { providerId } = useParams<{ providerId: string }>();
  
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: [`/api/providers/${providerId}/reviews`],
  });

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <i key={i} className={`fas fa-star ${i < rating ? 'text-yellow-400' : 'text-slate-300'}`}></i>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Reviews & Ratings</h1>
          <p className="text-slate-600">See what clients say about this professional</p>
        </div>

        {/* Rating Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-slate-800 mb-2">{averageRating}</div>
            <div className="flex justify-center gap-1 mb-4">
              {renderStars(Math.round(parseFloat(averageRating)))}
            </div>
            <p className="text-slate-600">Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <i className="fas fa-star text-5xl text-slate-300 mb-4"></i>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Reviews Yet</h2>
            <p className="text-slate-600">Be the first to leave a review for this professional!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-slate-800">{review.clientName}</p>
                    <p className="text-sm text-slate-500">Verified Client</p>
                  </div>
                  <div className="flex gap-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-slate-700 mb-4">{review.comment}</p>
                )}
                <p className="text-xs text-slate-500">
                  <i className="fas fa-calendar-alt mr-1"></i>
                  Service Date: {new Date().toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
