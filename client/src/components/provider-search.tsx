import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Provider } from "@shared/schema";

export default function ProviderSearch() {
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
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search providers or specialties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="input-provider-search"
        />

        {/* Specialty Filter */}
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="select-specialty"
        >
          <option value="">All Specialties</option>
          {specialties.map(specialty => (
            <option key={specialty} value={specialty}>{specialty}</option>
          ))}
        </select>

        {/* Rating Filter */}
        <div>
          <label className="text-sm text-slate-600 mb-2 block">Minimum Rating: {minRating}⭐</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={minRating}
            onChange={(e) => setMinRating(parseFloat(e.target.value))}
            className="w-full"
            data-testid="slider-rating"
          />
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-slate-600 mb-4">
        Found <span className="font-semibold text-slate-800">{filteredProviders.length}</span> provider{filteredProviders.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
