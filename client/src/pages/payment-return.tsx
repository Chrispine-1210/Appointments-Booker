import { Link, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";
export default function PaymentReturn() {
  const reference = new URLSearchParams(useSearch()).get("tx_ref") ?? "";
  // A callback is a request to verify, never evidence that money was received.
  const me = useQuery<{ appointmentId: number }>({
    queryKey: ["/api/payment-reference", reference],
    queryFn: async () => {
      return (
        await apiRequest(
          "GET",
          "/api/payments/reference/" + encodeURIComponent(reference),
        )
      ).json();
    },
    enabled: /^bp-[a-f0-9-]{36}$/.test(reference),
    retry: false,
  });
  const verify = useMutation({
    mutationFn: async () =>
      (
        await apiRequest(
          "POST",
          `/api/appointments/${me.data!.appointmentId}/verify-payment`,
          { reference },
        )
      ).json(),
  });
  useEffect(() => {
    if (me.data) verify.mutate();
  }, [me.data]);
  return (
    <section className="page-narrow section-space">
      <div className="card card-body">
        <p className="eyebrow">Payment check</p>
        <h1>
          {verify.data?.status === "paid"
            ? "Payment verified"
            : verify.data?.status === "verified_test"
              ? "Test payment verified"
              : "Checking your payment"}
        </h1>
        <p>
          {verify.data?.status === "paid"
            ? "The merchant gateway confirmed this payment. Bank payout timing is managed by the payment provider."
            : verify.data?.status === "verified_test"
              ? "This was a test transaction. No real collection has been recorded."
              : verify.data
                ? "The gateway has not confirmed payment yet. You can check again."
                : "We verify the amount, currency and reference directly with the payment provider."}
        </p>
        {(me.error || verify.error) && (
          <p className="form-error" role="alert">
            {(me.error ?? verify.error)?.message} Sign in using the account that
            created this booking, or reopen this page in the browser used to
            book.
          </p>
        )}
        {me.data && (
          <button
            className="btn btn-secondary"
            disabled={verify.isPending}
            onClick={() => verify.mutate()}
          >
            Check again
          </button>
        )}
        <p>
          <Link
            href={
              me.data
                ? `/confirmation/${me.data.appointmentId}`
                : "/my-bookings"
            }
            className="text-link"
          >
            Return to your booking
          </Link>
        </p>
      </div>
    </section>
  );
}
