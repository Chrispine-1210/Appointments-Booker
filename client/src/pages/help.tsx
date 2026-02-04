import { useState } from "react";
import Navigation from "@/components/navigation";

export default function Help() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const faqs = [
    {
      id: 1,
      question: "How do I book an appointment?",
      answer: "Visit the 'Find Providers' page, search for a professional, click their profile, and use the booking form to select your preferred date and time. You'll receive a confirmation email immediately."
    },
    {
      id: 2,
      question: "Can I cancel or reschedule my appointment?",
      answer: "Yes! Go to 'My Bookings' and click the 'Cancel' or 'Edit' button on your appointment. Cancellations must be made at least 24 hours before your appointment."
    },
    {
      id: 3,
      question: "How do I get my confirmation?",
      answer: "A confirmation email will be sent to the email address you provided during booking. You can also find your confirmation in 'My Bookings' anytime."
    },
    {
      id: 4,
      question: "What payment methods are accepted?",
      answer: "BookingPro accepts all major credit cards, debit cards, and digital wallets. Payment processing is secure and encrypted."
    },
    {
      id: 5,
      question: "Can I leave a review after my appointment?",
      answer: "Yes! After your appointment is completed, you'll receive an email with a link to leave a review. You can also access reviews from the provider's profile page."
    },
    {
      id: 6,
      question: "How do professionals set their availability?",
      answer: "Professionals can manage their working hours, days off, and available time slots from the Settings page under 'Working Hours'."
    },
    {
      id: 7,
      question: "Is my personal information secure?",
      answer: "Yes! BookingPro uses industry-standard encryption to protect all personal and payment information. We comply with GDPR and other privacy regulations."
    },
    {
      id: 8,
      question: "How do I contact support?",
      answer: "You can reach our support team through the Contact page or email us at support@bookingpro.com. We typically respond within 24 hours."
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Help & FAQ</h1>
          <p className="text-slate-600">Find answers to common questions</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search help topics..."
            className="w-full px-6 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="input-search-help"
          />
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <h3 className="font-bold text-slate-800">{faq.question}</h3>
                <i className={`fas fa-chevron-down text-primary transition-transform ${expandedId === faq.id ? 'rotate-180' : ''}`}></i>
              </button>
              {expandedId === faq.id && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-slate-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <i className="fas fa-headset text-4xl text-blue-600 mb-4"></i>
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Still need help?</h2>
          <p className="text-blue-700 mb-6">Can't find what you're looking for? Our support team is here to help!</p>
          <a href="mailto:support@bookingpro.com" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
