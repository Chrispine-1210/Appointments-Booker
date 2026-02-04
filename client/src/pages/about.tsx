import Navigation from "@/components/navigation";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">About BookingPro</h1>
          <p className="text-xl text-slate-600">Revolutionizing professional appointment scheduling</p>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Our Mission</h2>
          <p className="text-slate-700 text-lg leading-relaxed">
            BookingPro is dedicated to making appointment scheduling simple, efficient, and accessible for both professionals and clients. We believe that managing appointments shouldn't be complicated. Our platform combines intuitive design with powerful features to streamline the booking process for service providers and their clients.
          </p>
        </div>

        {/* Why Choose Us */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <i className="fas fa-rocket text-4xl text-primary mb-4"></i>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Fast & Easy</h3>
            <p className="text-slate-600">Book appointments in seconds with our streamlined interface</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <i className="fas fa-shield-alt text-4xl text-primary mb-4"></i>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Secure & Private</h3>
            <p className="text-slate-600">Your data is protected with enterprise-grade security</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <i className="fas fa-chart-line text-4xl text-primary mb-4"></i>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Grow Your Business</h3>
            <p className="text-slate-600">Analytics and insights to help you manage better</p>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-6">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <i className="fas fa-calendar-check text-primary text-2xl mt-1 flex-shrink-0"></i>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Smart Scheduling</h3>
                <p className="text-slate-600">Automated availability management and conflict detection</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <i className="fas fa-users text-primary text-2xl mt-1 flex-shrink-0"></i>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Client Management</h3>
                <p className="text-slate-600">Track clients, bookings, and communication history</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <i className="fas fa-bell text-primary text-2xl mt-1 flex-shrink-0"></i>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Smart Reminders</h3>
                <p className="text-slate-600">Automated reminders reduce no-shows</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <i className="fas fa-star text-primary text-2xl mt-1 flex-shrink-0"></i>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Reviews & Ratings</h3>
                <p className="text-slate-600">Build your reputation with verified client reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl shadow-lg p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-6">Join thousands of professionals using BookingPro to streamline their business</p>
          <Link href="/find">
            <button className="bg-white text-primary px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors font-semibold text-lg">
              Explore Now
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
