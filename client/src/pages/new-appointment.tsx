import BookingForm from "@/components/booking-form";
import { useProvider } from "@/hooks/useWorkspace";
import { PageHeader, LoadingState, ErrorState } from "@/components/product-ui";
export default function NewAppointment() {
  const query = useProvider();
  return (
    <>
      <PageHeader
        eyebrow="A place in your schedule"
        title="New appointment"
        description="Choose a service and time, then enter your client's details. Existing bookings block unavailable times."
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !query.data ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <section className="card" style={{ maxWidth: 880 }}>
          <BookingForm provider={query.data} prefillClient={false} />
        </section>
      )}
    </>
  );
}
