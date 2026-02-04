import Navigation from "@/components/navigation";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: December 1, 2025</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Introduction</h2>
            <p className="text-slate-700 mb-4">
              BookingPro ("we", "our", or "us") operates the BookingPro website and mobile application (collectively, the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Information Collection and Use</h2>
            <p className="text-slate-700 mb-4">We collect several different types of information for various purposes to provide and improve our Service:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>Personal Data: Name, email address, phone number, postal address</li>
              <li>Payment Information: Credit card details (processed securely through Stripe)</li>
              <li>Usage Data: Browser type, IP address, pages visited, access times</li>
              <li>Cookies: We use cookies to track user activity and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Use of Data</h2>
            <p className="text-slate-700 mb-4">BookingPro uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our Service</li>
              <li>To monitor the usage of our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Security of Data</h2>
            <p className="text-slate-700">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Changes to This Privacy Policy</h2>
            <p className="text-slate-700">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "effective date" at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Contact Us</h2>
            <p className="text-slate-700">
              If you have any questions about this Privacy Policy, please contact us at privacy@bookingpro.com or visit our Contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
