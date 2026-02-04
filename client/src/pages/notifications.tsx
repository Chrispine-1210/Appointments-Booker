import Navigation from "@/components/navigation";

export default function Notifications() {
  const notifications = [
    {
      id: 1,
      type: "appointment",
      title: "Appointment Confirmed",
      message: "Your appointment with Dr. Sarah Johnson on Dec 15 at 2:00 PM is confirmed",
      icon: "fas fa-calendar-check",
      color: "text-green-600",
      bgColor: "bg-green-50",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      type: "reminder",
      title: "Appointment Reminder",
      message: "Your appointment is tomorrow at 3:00 PM. Please arrive 5 minutes early.",
      icon: "fas fa-bell",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      time: "1 day ago",
      read: false,
    },
    {
      id: 3,
      type: "review",
      title: "Leave a Review",
      message: "How was your appointment with Dr. Sarah Johnson? Share your feedback!",
      icon: "fas fa-star",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      time: "3 days ago",
      read: true,
    },
    {
      id: 4,
      type: "cancelled",
      title: "Appointment Cancelled",
      message: "Your appointment with Dr. Johnson on Dec 10 has been cancelled.",
      icon: "fas fa-times-circle",
      color: "text-red-600",
      bgColor: "bg-red-50",
      time: "5 days ago",
      read: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Notifications</h1>
            <p className="text-slate-600">Stay updated on your appointments and bookings</p>
          </div>
          <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium text-sm">
            <i className="fas fa-trash mr-2"></i>Clear All
          </button>
        </div>

        {/* Notification Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          <button className="px-4 py-2 border-b-2 border-primary text-primary font-semibold">
            All
          </button>
          <button className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors">
            Unread
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl p-6 border-l-4 hover:shadow-lg transition-shadow ${
                notification.read ? 'bg-white border-slate-200' : `${notification.bgColor} border-${notification.color.split('-')[1]}-400`
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${notification.bgColor}`}>
                  <i className={`${notification.icon} ${notification.color}`}></i>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 mb-1">{notification.title}</h3>
                      <p className="text-slate-600 text-sm">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 ml-4 flex-shrink-0"></div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">{notification.time}</p>
                </div>

                <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 flex-shrink-0">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
