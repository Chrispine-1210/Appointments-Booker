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
import type { Task } from "@shared/schema";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("pending"),
  priority: z.string().default("medium"),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function Tasks() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/providers/1/tasks"],
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      dueDate: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return apiRequest("POST", "/api/tasks", {
        ...data,
        providerId: 1,
      });
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Your task has been created successfully.",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/providers/1/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Task",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskFormData> }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Task Updated",
        description: "Your task has been updated successfully.",
      });
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["/api/providers/1/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Task",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Task Deleted",
        description: "Your task has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers/1/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Task",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const toggleTaskStatus = (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-500";
      case "high":
        return "text-amber-500";
      case "low":
        return "text-slate-400";
      default:
        return "text-slate-500";
    }
  };

  const filteredTasks = tasks.filter(task => 
    filterStatus === "all" || task.status === filterStatus
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Tasks</h1>
              <p className="text-slate-600">Manage your tasks and stay organized</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewTask} className="w-full sm:w-auto">
                    <i className="fas fa-plus mr-2"></i>
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{selectedTask ? "Edit Task" : "New Task"}</DialogTitle>
                    <DialogDescription>
                      {selectedTask ? "Update your task details." : "Create a new task to stay organized."}
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
                              <Input placeholder="Enter task title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter task description"
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="submit"
                          disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                          className="flex-1"
                        >
                          {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {selectedTask ? "Updating..." : "Creating..."}
                            </>
                          ) : (
                            selectedTask ? "Update Task" : "Create Task"
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
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <i className="fas fa-tasks text-4xl text-slate-300 mb-4"></i>
              <p>No tasks found. Create your first task!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="bg-slate-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.status === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-slate-300 hover:border-green-500"
                      }`}
                    >
                      {task.status === "completed" && <i className="fas fa-check text-xs"></i>}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className={`font-medium ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-800"}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <i className={`fas fa-flag text-sm ${getPriorityColor(task.priority)}`}></i>
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(task.status)}`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                          {task.dueDate && (
                            <span>
                              <i className="fas fa-calendar mr-1"></i>
                              Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <span>Created: {format(new Date(task.createdAt!), "MMM d")}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-primary hover:text-primary-dark"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
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