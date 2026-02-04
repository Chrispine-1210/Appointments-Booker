import { useQuery } from "@tanstack/react-query";
import type { Analytics, Appointment } from "@shared/schema";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface AnalyticsDashboardProps {
  providerId: number;
}

export default function AnalyticsDashboard({ providerId }: AnalyticsDashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todayAnalytics } = useQuery<Analytics>({
    queryKey: [`/api/analytics/${providerId}`, today],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/providers/${providerId}/appointments`],
  });

  const chartData = [
    { name: 'Mon', bookings: 4, revenue: 240 },
    { name: 'Tue', bookings: 7, revenue: 420 },
    { name: 'Wed', bookings: 5, revenue: 300 },
    { name: 'Thu', bookings: 8, revenue: 480 },
    { name: 'Fri', bookings: 12, revenue: 720 },
    { name: 'Sat', bookings: 9, revenue: 540 },
    { name: 'Sun', bookings: 6, revenue: 360 },
  ];

  const metrics = [
    {
      label: "Total Bookings",
      value: appointments.length,
      icon: "fa-calendar-check",
      color: "blue",
      trend: "+12%",
    },
    {
      label: "Completed Today",
      value: todayAnalytics?.completedAppointments || 0,
      icon: "fa-check-circle",
      color: "green",
      trend: "+5%",
    },
    {
      label: "Revenue Today",
      value: `$${todayAnalytics?.totalRevenue || "0.00"}`,
      icon: "fa-dollar-sign",
      color: "purple",
      trend: "+18%",
    },
    {
      label: "Avg Rating",
      value: todayAnalytics?.averageRating || "0.00",
      icon: "fa-star",
      color: "amber",
      trend: "Stable",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, idx) => (
          <div 
            key={idx} 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group cursor-default"
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform ${
                  metric.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  metric.color === 'green' ? 'bg-green-50 text-green-600' :
                  metric.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  <i className={`fas ${metric.icon} text-lg`}></i>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                  metric.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 
                  metric.trend.startsWith('-') ? 'bg-red-50 text-red-600' : 
                  'bg-slate-50 text-slate-400'
                }`}>
                  {metric.trend}
                </span>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{metric.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{metric.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 tracking-tight">Booking Trends</h3>
            <select className="text-xs font-bold bg-slate-50 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{fontWeight: 'bold'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorBookings)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-800 tracking-tight mb-6">Revenue Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 4 ? 'hsl(var(--primary))' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}