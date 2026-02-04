import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import Navigation from "@/components/navigation";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Provider } from "@shared/schema";

const providerSchema = z.object({
  title: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  bio: z.string().optional(),
  socialLinks: z.object({
    website: z.string().url().optional().or(z.literal("")),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    facebook: z.string().optional(),
  }).optional(),
});

type ProviderFormData = z.infer<typeof providerSchema>;

export default function ProviderSettings() {
  const { toast } = useToast();
  const { data: provider, isLoading } = useQuery<Provider>({
    queryKey: ["/api/providers/1"],
  });

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      title: provider?.title || "",
      name: provider?.name || "",
      specialty: provider?.specialty || "",
      email: provider?.email || "",
      phone: provider?.phone || "",
      bio: provider?.bio || "",
      socialLinks: provider?.socialLinks || {
        website: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        facebook: "",
      },
    },
  });

  // Update default values when provider data is loaded
  React.useEffect(() => {
    if (provider) {
      form.reset({
        title: provider.title || "",
        name: provider.name || "",
        specialty: provider.specialty || "",
        email: provider.email || "",
        phone: provider.phone || "",
        bio: provider.bio || "",
        socialLinks: provider.socialLinks || {
          website: "",
          instagram: "",
          twitter: "",
          linkedin: "",
          facebook: "",
        },
      });
    }
  }, [provider, form]);

  const updateProviderMutation = useMutation({
    mutationFn: async (data: ProviderFormData) => {
      return apiRequest("PATCH", "/api/providers/1", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Provider Settings</h1>
          <p className="text-slate-600">Manage your professional profile and availability</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading profile...</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateProviderMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Sarah Johnson" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <FormControl>
                        <Input placeholder="Family Medicine" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
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
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Bio</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tell clients about your experience and qualifications..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Social Links</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourwebsite.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="socialLinks.instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram Handle</FormLabel>
                            <FormControl>
                              <Input placeholder="@username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="socialLinks.twitter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Twitter Handle</FormLabel>
                            <FormControl>
                              <Input placeholder="@username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updateProviderMutation.isPending}
                  className="w-full bg-primary text-white py-3 rounded-lg hover:bg-secondary transition-colors font-semibold disabled:opacity-50"
                  data-testid="button-save-profile"
                >
                  {updateProviderMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </Form>
          )}
        </div>

        {/* Additional Settings Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          {/* Working Hours */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-clock text-primary text-xl"></i>
              <h3 className="text-xl font-bold text-slate-800">Working Hours</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">Set your availability for appointments</p>
            <button className="w-full border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors font-medium">
              <i className="fas fa-cog mr-2"></i>Manage Hours
            </button>
          </div>

          {/* Services */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-briefcase text-primary text-xl"></i>
              <h3 className="text-xl font-bold text-slate-800">Services</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">Add or edit services you offer</p>
            <button className="w-full border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors font-medium">
              <i className="fas fa-plus mr-2"></i>Manage Services
            </button>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-bell text-primary text-xl"></i>
              <h3 className="text-xl font-bold text-slate-800">Notifications</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">Configure alert preferences</p>
            <button className="w-full border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors font-medium">
              <i className="fas fa-sliders-h mr-2"></i>Settings
            </button>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-credit-card text-primary text-xl"></i>
              <h3 className="text-xl font-bold text-slate-800">Payment</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">Manage payment methods and billing</p>
            <button className="w-full border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors font-medium">
              <i className="fas fa-wallet mr-2"></i>Manage Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
