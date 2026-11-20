import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
export function EmptyState({
  icon: Icon = CalendarDays,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState({
  label = "Loading your workspace",
}: {
  label?: string;
}) {
  return (
    <div role="status" className="loading-state">
      <LoaderCircle className="animate-spin" size={24} />
      <p>{label}…</p>
    </div>
  );
}
export function ErrorState({
  retry,
  message = "We couldn't load this page. Please try again.",
}: {
  retry?: () => void;
  message?: string;
}) {
  return (
    <div role="alert" className="empty-state">
      <AlertCircle size={30} />
      <h2>Something needs another try</h2>
      <p>{message}</p>
      {retry && (
        <button className="btn btn-secondary" onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </button>
      )}
    </div>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`person-avatar ${large ? "large" : ""}`}
    >
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "BP"}
    </span>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function LinkButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`btn ${secondary ? "btn-secondary" : "btn-primary"}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
