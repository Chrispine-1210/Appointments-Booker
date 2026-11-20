import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/product-ui";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/booking-utils";
interface Data {
  emailConfigured: boolean;
  paymentConfigured: boolean;
  paymentMode?: string;
  messages: Array<{
    id: string;
    kind: string;
    status: string;
    appointment_id: number;
    attempts: number;
    last_error: string;
  }>;
  payments: Array<{
    tx_ref: string;
    appointment_id: number;
    amount: string;
    status: string;
    mode: string;
    gateway_reference: string;
  }>;
}
export default function OperationsPage() {
  const q = useQuery<Data>({ queryKey: ["/api/operations"] }),
    client = useQueryClient();
  const verify = useMutation({
    mutationFn: async (p: Data["payments"][0]) =>
      apiRequest(
        "POST",
        `/api/appointments/${p.appointment_id}/verify-payment`,
        { reference: p.tx_ref },
      ),
    onSuccess: () => client.invalidateQueries(),
  });
  return (
    <>
      <PageHeader
        eyebrow="Delivery and collections"
        title="Operations"
        description="Email processing and independently verified gateway payments."
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        q.data && (
          <>
            <div className="form-grid">
              <section className="card card-body">
                <h2>Email delivery</h2>
                <p>
                  {q.data.emailConfigured
                    ? "Sender configured. Booking changes and reminders enter the delivery queue."
                    : "A verified sender and email API key are required before recovery links and booking messages can be sent."}
                </p>
                <p className="small muted">
                  Accepted means the email provider accepted the request. It
                  does not prove inbox delivery.
                </p>
              </section>
              <section className="card card-body">
                <h2>Online payments</h2>
                <p>
                  {q.data.paymentConfigured
                    ? `Gateway configured in ${q.data.paymentMode} mode.`
                    : "This professional has no configured merchant account. Online payment remains unavailable."}
                </p>
                <p className="small muted">
                  Only successful live verification counts as a collection. Bank
                  payouts, refunds and disputes are managed with your gateway.
                </p>
              </section>
            </div>
            <section className="card card-body section-space">
              <h2>Payment records</h2>
              {!q.data.payments.length ? (
                <EmptyState
                  title="No gateway payments"
                  description="A record appears when checkout starts for a booking."
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Evidence</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {q.data.payments.map((p) => (
                        <tr key={p.tx_ref}>
                          <td>#{p.appointment_id}</td>
                          <td>{money(p.amount)}</td>
                          <td>
                            {p.status} · {p.mode}
                          </td>
                          <td>
                            {p.gateway_reference ?? "Awaiting confirmation"}
                          </td>
                          <td>
                            {p.status === "pending" && (
                              <button
                                className="btn btn-secondary btn-small"
                                disabled={verify.isPending}
                                onClick={() => verify.mutate(p)}
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {verify.error && (
                <p className="form-error">{verify.error.message}</p>
              )}
            </section>
            <section className="card card-body section-space">
              <h2>Booking messages</h2>
              {!q.data.messages.length ? (
                <EmptyState
                  title="No queued messages"
                  description="Booking changes create a durable message record."
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.data.messages.map((m) => (
                        <tr key={m.id}>
                          <td>#{m.appointment_id}</td>
                          <td>{m.kind}</td>
                          <td>
                            {m.status === "sent"
                              ? "Accepted by email provider"
                              : m.status}
                          </td>
                          <td>
                            {m.attempts}
                            {m.last_error && (
                              <p className="small muted">{m.last_error}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
