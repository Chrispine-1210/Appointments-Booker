import { PageHeader } from "@/components/product-ui";
export default function Terms() {
  return (
    <div className="public-container public-page prose-page">
      <PageHeader
        eyebrow="Using BookingPro"
        title="Terms of use"
        description="Practical conditions for the current application. Updated 20 November 2026."
      />
      <section className="card card-body">
        <h2>The booking service</h2>
        <p>
          BookingPro provides tools to publish professional services, reserve
          appointment times and manage a private workspace. Professionals supply
          their own profile, qualifications, service descriptions, availability
          and pricing. A profile is not an endorsement or proof of professional
          credentials.
        </p>
        <h2>Your account and information</h2>
        <p>
          Provide accurate information, use an account you are entitled to use
          and keep your credentials private. Do not access another person's
          records, impersonate a professional, or submit abusive or unlawful
          content. Do not include unnecessary sensitive information in booking
          notes.
        </p>
        <h2>Appointments and changes</h2>
        <p>
          A booking is reserved when the system displays a saved confirmation.
          Availability is checked when a booking is saved. Signed-in clients can
          change active future appointments they created; guest and other
          arrangements should be discussed directly with the professional. The
          professional remains responsible for delivering their service.
        </p>
        <h2>Prices and payment</h2>
        <p>
          Prices are displayed in Malawi kwacha. BookingPro does not
          independently settle funds to a bank account. Online checkout is
          available only for configured professionals. Agree payment, refund
          terms and any service-specific cancellation conditions directly with
          the professional before your visit. A pending booking value is not a
          receipt.
        </p>
        <h2>Availability and support</h2>
        <p>
          Keep an independent copy of important appointment details. The
          application does not promise uninterrupted availability, automatic
          email reminders or a particular support response time. Use the help
          centre for current feature guidance and the professional's public
          contact details for questions about a visit.
        </p>
      </section>
    </div>
  );
}
