import React from "react";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Dr. Michael Chen",
      role: "Dentist",
      avatar: "MC",
      content: "BookingPro has completely transformed how I manage appointments. My clients love the easy booking process, and I've reduced no-shows by 80%.",
      rating: 5
    },
    {
      name: "Lisa Rodriguez",
      role: "Therapist",
      avatar: "LR",
      content: "The mobile interface is fantastic. I can manage my schedule anywhere, and the automatic reminders have saved me so much time.",
      rating: 5
    },
    {
      name: "James Wilson",
      role: "Consultant",
      avatar: "JW",
      content: "Setting up was incredibly easy. Within 30 minutes, I had my booking page live and ready to go. The customer support is also excellent.",
      rating: 5
    }
  ];

  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">What Our Users Say</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Join thousands of professionals who've streamlined their booking process
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="flex text-amber-400">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <i key={i} className="fas fa-star"></i>
                  ))}
                </div>
              </div>
              <p className="text-slate-600 mb-4">
                "{testimonial.content}"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                  {testimonial.avatar}
                </div>
                <div className="ml-3">
                  <div className="font-medium text-slate-800">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
