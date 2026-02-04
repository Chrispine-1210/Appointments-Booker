import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Memo } from "@shared/schema";

const memoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().default("general"),
  isImportant: z.boolean().default(false),
});

type MemoFormData = z.infer<typeof memoSchema>;

export default function Memos() {
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memos = [], isLoading } = useQuery<Memo[]>({
    queryKey: ["/api/providers/1/memos"],
  });

  const form = useForm<MemoFormData>({
    resolver: zodResolver(memoSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "general",
      isImportant: false,
    },
  });

  const createMemoMutation = useMutation({
    mutationFn: async (data: MemoFormData) => {
      return apiRequest("POST", "/api/memos", {
        ...data,
        providerId: 1,
      });
    },
    onSuccess: () => {
      toast({
        title: "Memo Created",
        description: "Your memo has been saved successfully.",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/providers/1/memos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Memo",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMemoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MemoFormData> }) => {
      return apiRequest("PATCH", `/api/memos/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Memo Updated",
        description: "Your memo has been updated successfully.",
      });
      setSelectedMemo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/providers/1/memos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Memo",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMemoMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/memos/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Memo Deleted",
        description: "Your memo has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers/1/memos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Memo",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MemoFormData) => {
    if (selectedMemo) {
      updateMemoMutation.mutate({ id: selectedMemo.id, data });
    } else {
      createMemoMutation.mutate(data);
    }
  };

  const handleEdit = (memo: Memo) => {
    setSelectedMemo(memo);
    form.reset({
      title: memo.title,
      content: memo.content,
      category: memo.category || "general",
      isImportant: memo.isImportant || false,
    });
    setIsDialogOpen(true);
  };

  const handleNewMemo = () => {
    setSelectedMemo(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "client":
        return "bg-blue-100 text-blue-800";
      case "appointment":
        return "bg-green-100 text-green-800";
      case "personal":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Memos</h1>
              <p className="text-slate-600">Keep track of important notes and reminders</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewMemo} className="w-full sm:w-auto">
                  <i className="fas fa-plus mr-2"></i>
                  New Memo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{selectedMemo ? "Edit Memo" : "New Memo"}</DialogTitle>
                  <DialogDescription>
                    {selectedMemo ? "Update your memo details." : "Create a new memo to keep track of important information."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter memo title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="appointment">Appointment</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter memo content"
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isImportant"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Mark as important</FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={createMemoMutation.isPending || updateMemoMutation.isPending}
                        className="flex-1"
                      >
                        {createMemoMutation.isPending || updateMemoMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {selectedMemo ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          selectedMemo ? "Update Memo" : "Create Memo"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Memos List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading memos...</p>
            </div>
          ) : memos.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <i className="fas fa-sticky-note text-4xl text-slate-300 mb-4"></i>
              <p>No memos found. Create your first memo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memos.map((memo) => (
                <div key={memo.id} className="bg-slate-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${getCategoryColor(memo.category || "general")}`}>
                      {memo.category || "general"}
                    </span>
                    {memo.isImportant && (
                      <i className="fas fa-star text-amber-500"></i>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{memo.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">{memo.content}</p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{format(new Date(memo.createdAt!), "MMM d, yyyy")}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(memo)}
                        className="text-primary hover:text-primary-dark"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => deleteMemoMutation.mutate(memo.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}