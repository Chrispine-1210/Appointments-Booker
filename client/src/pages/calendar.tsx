import { useState } from "react";
import Navigation from "@/components/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const appointments = [
    { date: "2025-12-05", title: "Dentist Appointment", time: "2:00 PM", provider: "Dr. Smith" },
    { date: "2025-12-10", title: "Hair Cut", time: "10:30 AM", provider: "Style Studio" },
    { date: "2025-12-15", title: "Doctor Check-up", time: "3:30 PM", provider: "Dr. Johnson" },
  ];

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter(a => a.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">My Calendar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-8">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <i className="fas fa-chevron-left text-primary"></i>
              </button>
              <h2 className="text-2xl font-bold text-slate-800">{format(currentDate, "MMMM yyyy")}</h2>
              <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <i className="fas fa-chevron-right text-primary"></i>
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center font-bold text-slate-600 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const dayAppts = getAppointmentsForDate(day);
                const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      !isCurrentMonth
                        ? "text-slate-300 bg-slate-50"
                        : isSelected
                        ? "bg-primary text-white"
                        : dayAppts.length > 0
                        ? "bg-blue-50 text-primary border-2 border-primary"
                        : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>{format(day, "d")}</div>
                    {dayAppts.length > 0 && <div className="text-xs mt-1">•</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Upcoming Appointments"}
            </h3>

            <div className="space-y-4">
              {selectedDate && getAppointmentsForDate(selectedDate).length === 0 ? (
                <p className="text-slate-600 text-sm">No appointments scheduled for this date</p>
              ) : (
                (selectedDate ? getAppointmentsForDate(selectedDate) : appointments).map((appt, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:border-primary transition-colors">
                    <p className="font-bold text-slate-800">{appt.title}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      <i className="fas fa-clock mr-2"></i>{appt.time}
                    </p>
                    <p className="text-sm text-slate-600">
                      <i className="fas fa-user-md mr-2"></i>{appt.provider}
                    </p>
                    <button className="mt-3 w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors text-sm font-medium">
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* New Appointment Button */}
            <button className="w-full mt-6 bg-gradient-to-r from-primary to-blue-600 text-white py-3 rounded-lg hover:shadow-lg transition-shadow font-semibold">
              <i className="fas fa-plus mr-2"></i>New Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
