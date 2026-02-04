import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Provider } from "@shared/schema";

export default function HeroSection() {
  const { user } = useAuth();
  const { data: provider } = useQuery<Provider>({
    queryKey: ["/api/providers/1"],
    enabled: !!user,
  });

  const displayName = provider ? `${provider.title} ${provider.name}`.trim() : (user as any)?.firstName || "Professional";

  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
          <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
            <h1 className="text-4xl tracking-tight font-extrabold text-slate-900 sm:text-5xl md:text-6xl mb-6">
              <span className="block xl:inline">Modern Booking for</span>{" "}
              <span className="block text-primary xl:inline">Modern Professionals</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-3xl mx-auto lg:mx-0">
              Eliminate phone tag and email back-and-forth. Let your clients book appointments 24/7 
              with our intuitive scheduling platform designed for industry professionals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
              {user ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <button className="w-full bg-primary text-white px-8 py-3 rounded-lg hover:bg-secondary transition-colors font-semibold text-lg flex items-center justify-center shadow-lg shadow-blue-200">
                    <i className="fas fa-tachometer-alt mr-2"></i>
                    Go to Dashboard
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/find" className="w-full sm:w-auto">
                    <button className="w-full bg-primary text-white px-8 py-3 rounded-lg hover:bg-secondary transition-colors font-semibold text-lg flex items-center justify-center shadow-lg shadow-blue-200" data-testid="button-find-providers">
                      <i className="fas fa-search mr-2"></i>
                      Book Now
                    </button>
                  </Link>
                  <Link href="/api/login" className="w-full sm:w-auto">
                    <button className="w-full border-2 border-slate-200 text-slate-700 px-8 py-3 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-lg flex items-center justify-center">
                      <i className="fas fa-user-md mr-2"></i>
                      Professional Sign Up
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6">
            <div className="relative mx-auto w-full rounded-2xl shadow-2xl overflow-hidden bg-primary bg-opacity-5 border border-slate-100 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary font-bold text-2xl shadow-inner">
                  {displayName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">{displayName}</h3>
                  <p className="text-primary font-medium">{provider?.specialty || "Professional Specialist"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-primary transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-primary group-hover:text-white transition-colors">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Book Appointment</p>
                      <p className="text-xs text-slate-500">Available slots tomorrow</p>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300"></i>
                </div>
                {provider?.socialLinks?.website && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-primary transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-primary group-hover:text-white transition-colors">
                        <i className="fas fa-globe"></i>
                      </div>
                      <p className="font-semibold text-slate-800">Visit Website</p>
                    </div>
                    <i className="fas fa-chevron-right text-slate-300"></i>
                  </div>
                )}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-primary transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center text-pink-600 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                      <i className="fab fa-instagram"></i>
                    </div>
                    <p className="font-semibold text-slate-800">Instagram Profile</p>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300"></i>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Your Professional Link-in-Bio</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
