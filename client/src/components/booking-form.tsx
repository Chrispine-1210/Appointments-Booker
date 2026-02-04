import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format, addDays, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Provider, Service } from "@shared/schema";

const bookingSchema = z.object({
  serviceId: z.number().min(1, "Please select a service"),
  appointmentDate: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a time"),
  clientName: z.string().min(1, "Name is required"),
  clientEmail: z.string().email("Valid email is required"),
  clientPhone: z.string().min(1, "Phone number is required"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  provider: Provider;
}

export default function BookingForm({ provider }: BookingFormProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get services for this provider
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: [`/api/providers/${provider.id}/services`],
  });

  // Get available time slots for selected date
  const { data: availableSlots = [] } = useQuery<string[]>({
    queryKey: [`/api/providers/${provider.id}/available-slots`, { date: selectedDate }],
    enabled: !!selectedDate,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
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
    mutationFn: async (data: BookingFormData) => {
      if (!selectedService) throw new Error("No service selected");
      
      const appointmentData = {
        providerId: provider.id,
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
        title: "Appointment Booked!",
        description: "You will receive a confirmation email shortly.",
      });
      form.reset();
      setSelectedService(null);
      setSelectedDate("");
      setSelectedTime("");
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${provider.id}/available-slots`] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
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
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  };

  const onSubmit = (data: BookingFormData) => {
    createAppointmentMutation.mutate(data);
  };

  return (
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
                      className={`border-2 rounded-xl p-5 cursor-pointer transition-all hover-scale ${
                        field.value === service.id
                          ? "border-primary bg-primary bg-opacity-5 shadow-inner"
                          : "border-slate-100 hover:border-primary/50 bg-white"
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
              <FormLabel className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Date</FormLabel>
              <FormControl>
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
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
                        className={`flex-shrink-0 w-16 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          field.value === dateString
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105"
                            : isPast
                            ? "border-slate-100 opacity-30 cursor-not-allowed bg-slate-50"
                            : "border-slate-100 bg-white hover:border-primary/50 hover:shadow-md"
                        }`}
                        onClick={() => {
                          field.onChange(dateString);
                          setSelectedDate(dateString);
                          form.setValue("startTime", "");
                          setSelectedTime("");
                        }}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                          {format(date, "EEE")}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {format(date, "d")}
                        </span>
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
              <FormItem className="animate-in fade-in slide-in-from-top-4 duration-500">
                <FormLabel className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Time</FormLabel>
                <FormControl>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          className={`p-4 text-sm font-black border-2 rounded-xl transition-all ${
                            field.value === time
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                              : "border-slate-100 bg-white hover:border-primary/50"
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
                  ) : (
                    <div className="p-8 bg-slate-50 rounded-2xl text-center text-slate-400 font-medium">
                      <i className="fas fa-calendar-times text-2xl mb-2 block opacity-20"></i>
                      No slots available for this date.
                    </div>
                  )}
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
                <FormLabel>Full Name</FormLabel>
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
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific concerns or questions?"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Booking Summary */}
        {selectedService && selectedDate && selectedTime && (
          <div className="bg-slate-50 rounded-lg p-6">
            <h4 className="font-semibold text-slate-800 mb-4">Booking Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Service:</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date:</span>
                <span className="font-medium">{format(new Date(selectedDate), "EEEE, MMMM d")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Time:</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Duration:</span>
                <span className="font-medium">{selectedService.duration} minutes</span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span className="text-primary">${selectedService.price}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="sticky bottom-0 pt-8 pb-4 bg-white/90 backdrop-blur-md -mx-8 px-8 border-t border-slate-50 mt-4 z-20">
          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
            disabled={createAppointmentMutation.isPending}
          >
            {createAppointmentMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Securing Your Spot...
              </>
            ) : (
              <>
                <i className="fas fa-calendar-check mr-3"></i>
                Book Now • ${selectedService?.price || '0'}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          By booking, you agree to our terms of service and privacy policy. You'll receive a confirmation email shortly.
        </p>
      </form>
    </Form>
  );
}
