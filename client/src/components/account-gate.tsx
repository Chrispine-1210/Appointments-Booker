import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function AccountGate({ children, provider = false }: { children: ReactNode; provider?: boolean }) {
  const { user, isLoading, error } = useAuth();
  if (isLoading) return <p className="p-8 text-center">Checking your account…</p>;
  if (error) return <div role="alert" className="p-8 text-center">We could not check your account. <button onClick={() => window.location.reload()} className="text-primary underline">Retry</button></div>;
  if (!user) return <Redirect to="/login" />;
  if (provider && !user.providerId) return <Redirect to="/onboarding" />;
  return <>{children}</>;
}
