import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format, addDays, startOfWeek } from "date-fns";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Service } from "@shared/schema";

const appointmentSchema = z.object({
  serviceId: z.number().min(1, "Please select a service"),
  appointmentDate: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a time"),
  clientName: z.string().min(1, "Name is required"),
  clientEmail: z.string().email("Valid email is required"),
  clientPhone: z.string().min(1, "Phone number is required"),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function NewAppointment() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get services for this provider
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: [`/api/providers/1/services`],
  });

  // Get available time slots for selected date
  const { data: availableSlots = [] } = useQuery<string[]>({
    queryKey: [`/api/providers/1/available-slots`, { date: selectedDate }],
    enabled: !!selectedDate,
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceId: 0,
      appointmentDate: "",
      startTime: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      notes: "",
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!selectedService) throw new Error("No service selected");
      
      const appointmentData = {
        providerId: 1,
        serviceId: data.serviceId,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        endTime: calculateEndTime(data.startTime, selectedService.duration),
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        notes: data.notes || "",
        status: "confirmed" as const,
      };

      return apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      toast({
        title: "Appointment Created!",
        description: "The appointment has been scheduled successfully.",
      });
      form.reset();
      setSelectedService(null);
      setSelectedDate("");
      setSelectedTime("");
      queryClient.invalidateQueries({ queryKey: [`/api/providers/1/available-slots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/1/appointments`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Appointment",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  const generateWeekDates = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start from Monday
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const onSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">New Appointment</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Schedule a new appointment for a client
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white p-6 sm:p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i className="fas fa-calendar-plus text-2xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold">Dr. Sarah Johnson</h2>
                <p className="text-blue-100">Family Medicine</p>
              </div>
            </div>
          </div>
          
          {/* Form */}
          <div className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Service Selection */}
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Service</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                field.value === service.id
                                  ? "border-primary bg-primary bg-opacity-5"
                                  : "border-slate-200 hover:border-primary"
                              }`}
                              onClick={() => {
                                field.onChange(service.id);
                                setSelectedService(service);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-slate-800">{service.name}</div>
                                  <div className="text-sm text-slate-600">{service.duration} min</div>
                                </div>
                                <div className="text-primary font-semibold">${service.price}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Selection */}
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Date</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-7 gap-2">
                          {generateWeekDates().map((date) => {
                            const dateString = format(date, "yyyy-MM-dd");
                            const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                            const isPast = date < new Date() && !isToday;
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                              <button
                                key={dateString}
                                type="button"
                                disabled={isPast || isWeekend}
                                className={`p-3 text-sm border rounded-lg transition-colors ${
                                  field.value === dateString
                                    ? "bg-primary text-white border-primary"
                                    : isPast || isWeekend
                                    ? "border-slate-200 opacity-50 cursor-not-allowed"
                                    : "border-slate-200 hover:border-primary hover:bg-primary hover:text-white"
                                }`}
                                onClick={() => {
                                  field.onChange(dateString);
                                  setSelectedDate(dateString);
                                  form.setValue("startTime", "");
                                  setSelectedTime("");
                                }}
                              >
                                <div className="font-medium">{format(date, "d")}</div>
                                <div className="text-xs">{format(date, "EEE")}</div>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Selection */}
                {selectedDate && (
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Time</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {availableSlots.map((time) => (
                              <button
                                key={time}
                                type="button"
                                className={`p-3 text-sm border rounded-lg transition-colors ${
                                  field.value === time
                                    ? "bg-primary text-white border-primary"
                                    : "border-slate-200 hover:border-primary hover:bg-primary hover:text-white"
                                }`}
                                onClick={() => {
                                  field.onChange(time);
                                  setSelectedTime(time);
                                }}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Client Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Appointment...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calendar-plus mr-2"></i>
                      Create Appointment
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}