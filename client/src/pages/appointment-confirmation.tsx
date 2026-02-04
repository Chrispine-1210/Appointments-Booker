import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { format } from "date-fns";
import type { Appointment, Provider } from "@shared/schema";

export default function AppointmentConfirmation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  
  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: [`/api/appointments/${appointmentId}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading confirmation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <i className="fas fa-exclamation-triangle text-5xl text-amber-500 mb-4"></i>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Appointment Not Found</h2>
            <p className="text-slate-600 mb-6">We couldn't find the appointment you're looking for.</p>
            <Link href="/find">
              <button className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition-colors">
                Go Back
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white mb-8 text-center">
          <i className="fas fa-check-circle text-5xl mb-4"></i>
          <h1 className="text-3xl font-bold mb-2">Appointment Confirmed!</h1>
          <p className="text-green-100">Your appointment has been successfully booked. Check your email for details.</p>
        </div>

        {/* Confirmation Details */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Booking Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Date & Time */}
            <div className="border-l-4 border-primary pl-4">
              <p className="text-slate-600 text-sm mb-1">Date & Time</p>
              <p className="font-bold text-slate-800">{format(new Date(appointment.appointmentDate), 'MMMM dd, yyyy')}</p>
              <p className="font-bold text-slate-800">{appointment.startTime} - {appointment.endTime}</p>
            </div>

            {/* Confirmation Number */}
            <div className="border-l-4 border-primary pl-4">
              <p className="text-slate-600 text-sm mb-1">Confirmation #</p>
              <p className="font-bold text-slate-800 text-lg">#{String(appointment.id).padStart(6, '0')}</p>
            </div>

            {/* Client Name */}
            <div className="border-l-4 border-primary pl-4">
              <p className="text-slate-600 text-sm mb-1">Client Name</p>
              <p className="font-bold text-slate-800">{appointment.clientName}</p>
            </div>

            {/* Status */}
            <div className="border-l-4 border-primary pl-4">
              <p className="text-slate-600 text-sm mb-1">Status</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 capitalize">
                {appointment.status}
              </span>
            </div>

            {/* Contact Info */}
            <div className="border-l-4 border-primary pl-4">
              <p className="text-slate-600 text-sm mb-1">Email</p>
              <p className="font-bold text-slate-800">{appointment.clientEmail}</p>
            </div>

            {/* Phone */}
            <div className="border-l-4 border-primary pl-4">
              <p className="text-slate-600 text-sm mb-1">Phone</p>
              <p className="font-bold text-slate-800">{appointment.clientPhone}</p>
            </div>
          </div>

          {appointment.notes && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-slate-600 text-sm mb-2">Notes</p>
              <p className="text-slate-800">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold text-blue-900 mb-4">What Happens Next?</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <i className="fas fa-check-circle text-blue-600 mr-3 mt-1 flex-shrink-0"></i>
              <span className="text-blue-900"><strong>Confirmation Email</strong> - You'll receive a confirmation email with appointment details</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle text-blue-600 mr-3 mt-1 flex-shrink-0"></i>
              <span className="text-blue-900"><strong>Appointment Reminder</strong> - We'll send you a reminder 24 hours before your appointment</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle text-blue-600 mr-3 mt-1 flex-shrink-0"></i>
              <span className="text-blue-900"><strong>Pre-Appointment</strong> - Arrive 5-10 minutes early to check in</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle text-blue-600 mr-3 mt-1 flex-shrink-0"></i>
              <span className="text-blue-900"><strong>Leave a Review</strong> - After your appointment, rate your experience</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/find" className="flex-1">
            <button className="w-full bg-primary text-white py-3 rounded-lg hover:bg-secondary transition-colors font-semibold">
              <i className="fas fa-search mr-2"></i>Book Another Appointment
            </button>
          </Link>
          <button className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-lg hover:bg-slate-50 transition-colors font-semibold">
            <i className="fas fa-download mr-2"></i>Download Confirmation
          </button>
        </div>
      </div>
    </div>
  );
}
