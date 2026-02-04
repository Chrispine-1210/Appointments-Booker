import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import type { Provider, Service } from "@shared/schema";

export default function FindProviders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [minRating, setMinRating] = useState(0);

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["/api/providers"],
  });

  const specialties = [...new Set(providers.map(p => p.specialty))];

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !selectedSpecialty || provider.specialty === selectedSpecialty;
    const matchesRating = parseFloat(provider.rating) >= minRating;
    return matchesSearch && matchesSpecialty && matchesRating;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Find & Book Professionals</h1>
          <p className="text-xl text-slate-600">Search for healthcare providers, therapists, and service professionals in your area</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Search Input */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Search by Name or Service</label>
              <input
                type="text"
                placeholder="e.g., dentist, Dr. Smith, therapy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-provider-search"
              />
            </div>

            {/* Specialty Filter */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Specialty</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="select-specialty"
              >
                <option value="">All Specialties</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Minimum Rating: {minRating}⭐</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                data-testid="slider-rating"
              />
            </div>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-slate-600">
            Found <span className="font-semibold text-slate-800">{filteredProviders.length}</span> provider{filteredProviders.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Provider Grid */}
        {filteredProviders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <i className="fas fa-search text-5xl text-slate-300 mb-4"></i>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No Providers Found</h3>
            <p className="text-slate-600">Try adjusting your search criteria or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div key={provider.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-slate-100">
                {/* Provider Card Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center font-bold text-xl">
                      {provider.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {parseFloat(provider.rating) > 0 && (
                      <div className="bg-yellow-400 text-slate-900 px-3 py-1 rounded-full text-sm font-semibold">
                        ⭐ {provider.rating}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{provider.title} {provider.name}</h3>
                  <p className="text-blue-100 text-sm">{provider.specialty}</p>
                </div>

                {/* Provider Card Body */}
                <div className="p-6">
                  {provider.bio && (
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">{provider.bio}</p>
                  )}
                  
                  <div className="space-y-3 mb-6 text-sm text-slate-600">
                    <div className="flex items-center">
                      <i className="fas fa-envelope w-5 text-primary mr-3"></i>
                      {provider.email}
                    </div>
                    {provider.socialLinks && (provider.socialLinks.website || provider.socialLinks.instagram) && (
                      <div className="flex gap-4 mt-2">
                        {provider.socialLinks.website && (
                          <a href={provider.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                            <i className="fas fa-globe mr-1"></i> Website
                          </a>
                        )}
                        {provider.socialLinks.instagram && (
                          <a href={`https://instagram.com/${provider.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline flex items-center">
                            <i className="fab fa-instagram mr-1"></i> Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Book Button */}
                  <Link href={`/book/${provider.id}`}>
                    <button className="w-full bg-primary text-white py-3 rounded-lg hover:bg-secondary transition-colors font-semibold flex items-center justify-center">
                      <i className="fas fa-calendar-check mr-2"></i>
                      Book Appointment
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
