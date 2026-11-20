import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type {
  Appointment,
  Provider,
  Service,
  Task,
  Memo,
} from "@shared/schema";
export function useAppointments() {
  const { providerId } = useAuth();
  return useQuery<Appointment[]>({
    queryKey: [
      providerId
        ? `/api/providers/${providerId}/appointments`
        : "/api/appointments/my",
    ],
    refetchOnWindowFocus: true,
  });
}
export function useServices(id?: number | null) {
  const { providerId } = useAuth();
  const target = id ?? providerId;
  return useQuery<Service[]>({
    queryKey: [`/api/providers/${target}/services`],
    enabled: !!target,
  });
}
export function useProvider() {
  const { providerId } = useAuth();
  return useQuery<Provider>({
    queryKey: [`/api/providers/${providerId}`],
    enabled: !!providerId,
  });
}
export function useTasks() {
  const { providerId } = useAuth();
  return useQuery<Task[]>({
    queryKey: [`/api/providers/${providerId}/tasks`],
    enabled: !!providerId,
  });
}
export function useMemos() {
  const { providerId } = useAuth();
  return useQuery<Memo[]>({
    queryKey: [`/api/providers/${providerId}/memos`],
    enabled: !!providerId,
  });
}
