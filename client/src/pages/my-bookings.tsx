import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { format } from "date-fns";
import type { Appointment, Provider, Service } from "@shared/schema";

export default function MyBookings() {
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/my"],
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">My Appointments</h1>
          <p className="text-slate-600">View and manage all your bookings in one place</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your bookings...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <i className="fas fa-calendar-alt text-5xl text-slate-300 mb-4"></i>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Bookings Yet</h2>
            <p className="text-slate-600 mb-6">You haven't booked any appointments yet. Start by finding a professional!</p>
            <Link href="/find">
              <button className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition-colors">
                Browse Professionals
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                        <i className="fas fa-calendar-check text-primary"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Appointment #{appointment.id}</h3>
                        <p className="text-sm text-slate-600">{appointment.clientName}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-slate-500">Date</p>
                        <p className="font-semibold text-slate-800">{format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Time</p>
                        <p className="font-semibold text-slate-800">{appointment.startTime} - {appointment.endTime}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Status</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="font-semibold text-slate-800 text-xs">{appointment.clientEmail}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium">
                      <i className="fas fa-edit mr-2"></i>Edit
                    </button>
                    <button className="px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-red-700 font-medium">
                      <i className="fas fa-trash mr-2"></i>Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
