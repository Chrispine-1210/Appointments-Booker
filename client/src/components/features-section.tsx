import React from "react";

export default function FeaturesSection() {
  const features = [
    {
      icon: "fas fa-clock",
      title: "24/7 Online Booking",
      description: "Let clients book appointments anytime, anywhere. No more missed calls or scheduling conflicts.",
      color: "bg-primary"
    },
    {
      icon: "fas fa-bell",
      title: "Smart Reminders",
      description: "Automated email and SMS reminders reduce no-shows and keep everyone on schedule.",
      color: "bg-accent"
    },
    {
      icon: "fas fa-sync",
      title: "Calendar Sync",
      description: "Seamlessly sync with Google Calendar, Outlook, and other popular calendar apps.",
      color: "bg-amber-500"
    },
    {
      icon: "fas fa-mobile-alt",
      title: "Mobile Optimized",
      description: "Perfect experience on all devices. Manage bookings on-the-go with our mobile app.",
      color: "bg-purple-500"
    },
    {
      icon: "fas fa-chart-line",
      title: "Analytics & Reports",
      description: "Track your business performance with detailed reports and insights.",
      color: "bg-red-500"
    },
    {
      icon: "fas fa-shield-alt",
      title: "Secure & Compliant",
      description: "Bank-level security with HIPAA compliance for healthcare professionals.",
      color: "bg-indigo-500"
    }
  ];

  return (
    <section id="features" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Everything You Need</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Powerful features designed to streamline your booking process and grow your business
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${feature.color} text-white rounded-lg flex items-center justify-center mb-4`}>
                <i className={`${feature.icon} text-xl`}></i>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
