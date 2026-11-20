import { Link } from "wouter";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/product-ui";
export default function NotFound() {
  return (
    <div className="public-container public-page">
      <EmptyState
        icon={Search}
        title="This page wandered off."
        description="The address may have changed, or the page doesn't exist. Let's get you back to your day."
        action={
          <Link href="/" className="btn btn-primary">
            Back to BookingPro
          </Link>
        }
      />
    </div>
  );
}
