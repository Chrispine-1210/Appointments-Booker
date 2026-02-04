import * as React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import BookingForm from "@/components/booking-form";
import type { Provider } from "@shared/schema";

export default function Booking() {
  const { providerId } = useParams<{ providerId: string }>();
  
  const { data: provider, isLoading } = useQuery<Provider>({
    queryKey: [`/api/providers/${providerId}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading provider information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Provider Not Found</h2>
            <p className="text-slate-600">The provider you're looking for doesn't exist or is no longer available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">Reserve Your Session</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">
            You're booking with <span className="text-primary font-bold">{provider.title} {provider.name}</span>. Select your service below to begin.
          </p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          {/* Provider Info Header */}
          <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <i className="fas fa-calendar-check text-8xl rotate-12"></i>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl border-4 border-white/10">
                {provider.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-center sm:text-left space-y-2">
                <h2 className="text-2xl font-black">{provider.title} {provider.name}</h2>
                <p className="text-primary font-bold uppercase tracking-widest text-xs">{provider.specialty}</p>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
                    <i className="fas fa-star text-amber-400"></i>
                    {provider.rating} ({provider.reviewCount} reviews)
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
                    <i className="fas fa-bolt text-primary"></i>
                    Fast Responder
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Booking Form Area */}
          <div className="p-8 sm:p-12">
            <div className="max-w-2xl mx-auto">
              <BookingForm provider={provider} />
            </div>
          </div>
        </div>
        
        {/* Trust Badge */}
        <div className="mt-10 flex flex-col items-center gap-4 opacity-50 grayscale hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Professional Booking</p>
          <div className="flex gap-6 text-2xl text-slate-300">
            <i className="fab fa-cc-stripe"></i>
            <i className="fab fa-cc-visa"></i>
            <i className="fab fa-cc-mastercard"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
