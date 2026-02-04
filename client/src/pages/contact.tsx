import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navigation from "@/components/navigation";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll get back to you soon!",
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Get in Touch</h1>
          <p className="text-slate-600">We'd love to hear from you. Send us a message!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <i className="fas fa-map-marker-alt text-2xl text-primary mb-4"></i>
              <h3 className="font-bold text-slate-800 mb-2">Address</h3>
              <p className="text-slate-600 text-sm">123 Business Avenue<br />San Francisco, CA 94102<br />USA</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <i className="fas fa-phone text-2xl text-primary mb-4"></i>
              <h3 className="font-bold text-slate-800 mb-2">Phone</h3>
              <p className="text-slate-600 text-sm">+1 (555) 123-4567<br />Available 9AM - 5PM PST</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <i className="fas fa-envelope text-2xl text-primary mb-4"></i>
              <h3 className="font-bold text-slate-800 mb-2">Email</h3>
              <p className="text-slate-600 text-sm">support@bookingpro.com<br />Response time: 24 hours</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <i className="fas fa-clock text-2xl text-primary mb-4"></i>
              <h3 className="font-bold text-slate-800 mb-2">Hours</h3>
              <p className="text-slate-600 text-sm">
                Mon - Fri: 9AM - 6PM<br />
                Sat: 10AM - 4PM<br />
                Sun: Closed
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="How can we help?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us more about your inquiry..." rows={6} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-3 rounded-lg hover:bg-secondary transition-colors font-semibold"
                    data-testid="button-send-message"
                  >
                    Send Message
                  </button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
