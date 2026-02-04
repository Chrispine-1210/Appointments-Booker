import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Provider } from "@shared/schema";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: provider } = useQuery<Provider>({
    queryKey: ["/api/providers/1"],
    enabled: !!user,
  });

  const displayName = provider ? `${provider.title} ${provider.name}`.trim() : (user as any)?.firstName || "User";

  return (
    <nav className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <i className="fas fa-calendar-check text-xl"></i>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">BookingPro</span>
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className="fas fa-bars text-slate-600"></i>
          </button>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/dashboard">
              <button className={`px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-slate-50 ${location === '/dashboard' ? 'text-primary bg-primary/5' : 'text-slate-600'}`}>
                Dashboard
              </button>
            </Link>
            <Link href="/memos">
              <button className={`px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-slate-50 ${location === '/memos' ? 'text-primary bg-primary/5' : 'text-slate-600'}`}>
                Memos
              </button>
            </Link>
            <Link href="/tasks">
              <button className={`px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-slate-50 ${location === '/tasks' ? 'text-primary bg-primary/5' : 'text-slate-600'}`}>
                Tasks
              </button>
            </Link>
            
            <div className="h-6 w-px bg-slate-200 mx-4"></div>

            {user ? (
              <div className="flex items-center space-x-3">
                <Link href="/notifications">
                  <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-all">
                    <i className="fas fa-bell text-lg"></i>
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  </button>
                </Link>
                <Link href="/settings">
                  <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-all">
                    <i className="fas fa-cog text-lg"></i>
                  </button>
                </Link>
                
                <div className="flex items-center gap-3 pl-2">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-slate-900 leading-none">{displayName}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Professional</span>
                  </div>
                  <button 
                    onClick={() => window.location.href = "/api/logout"}
                    className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                    title="Sign Out"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/find">
                <button className="bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-secondary transition-all font-black shadow-lg shadow-primary/20 active:scale-95">
                  Get Started
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-2 space-y-1">
            <a href="#features" className="block px-3 py-2 text-slate-600 hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="block px-3 py-2 text-slate-600 hover:text-primary transition-colors">How It Works</a>
            <Link 
              href="/dashboard" 
              className={`block px-3 py-2 text-slate-600 hover:text-primary transition-colors ${location === '/dashboard' ? 'text-primary font-medium' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/memos" 
              className={`block px-3 py-2 text-slate-600 hover:text-primary transition-colors ${location === '/memos' ? 'text-primary font-medium' : ''}`}
            >
              Memos
            </Link>
            <Link 
              href="/tasks" 
              className={`block px-3 py-2 text-slate-600 hover:text-primary transition-colors ${location === '/tasks' ? 'text-primary font-medium' : ''}`}
            >
              Tasks
            </Link>
            {user ? (
              <div className="mt-3 space-y-2">
                <Link href="/my-bookings">
                  <button className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-left">
                    <i className="fas fa-calendar-alt mr-2"></i>My Bookings
                  </button>
                </Link>
                <Link href="/notifications">
                  <button className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-left">
                    <i className="fas fa-bell mr-2"></i>Notifications
                  </button>
                </Link>
                <Link href="/settings">
                  <button className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-left">
                    <i className="fas fa-cog mr-2"></i>Settings
                  </button>
                </Link>
                <div className="px-3 py-2 text-sm text-slate-600">
                  {displayName}
                </div>
                <button 
                  onClick={() => window.location.href = "/api/logout"}
                  className="w-full bg-slate-200 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-medium block text-center"
                  data-testid="button-sign-out-mobile"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/find">
                <button className="w-full mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium">
                  Get Started
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
