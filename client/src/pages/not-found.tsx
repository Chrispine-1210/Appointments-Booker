import { Link } from "wouter";
import Navigation from "@/components/navigation";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold text-primary mb-4">404</div>
          <i className="fas fa-map text-7xl text-slate-300 block mb-8"></i>
        </div>

        <h1 className="text-4xl font-bold text-slate-800 mb-4">Page Not Found</h1>
        <p className="text-lg text-slate-600 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>

        <div className="space-y-4">
          <p className="text-slate-600 mb-8">Here are some helpful links instead:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link href="/">
              <button className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-colors font-semibold">
                <i className="fas fa-home mr-2"></i>Home
              </button>
            </Link>
            <Link href="/find">
              <button className="w-full px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors font-semibold">
                <i className="fas fa-search mr-2"></i>Find Professionals
              </button>
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-left">
            <p className="text-sm text-blue-900">
              <strong>Did you know?</strong> You can explore our platform from the home page or search for professionals to book an appointment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
