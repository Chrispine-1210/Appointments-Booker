import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  NotebookPen,
  BriefcaseBusiness,
  UsersRound,
  Activity,
  Settings2,
  Search,
  Menu,
  LogOut,
  Plus,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Avatar } from "./product-ui";
import Navigation from "./navigation";
import Footer from "./footer";
const providerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/appointments", label: "Appointments", icon: ClipboardList },
  { href: "/services", label: "Services", icon: BriefcaseBusiness },
  { href: "/messages", label: "Client contacts", icon: UsersRound },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/memos", label: "Notes", icon: NotebookPen },
  { href: "/notifications", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/my-bookings", label: "My own bookings", icon: CalendarCheck2 },
];
const clientLinks = [
  { href: "/my-bookings", label: "My appointments", icon: CalendarDays },
  { href: "/find", label: "Find a professional", icon: Search },
  { href: "/messages", label: "My contacts", icon: UsersRound },
  { href: "/notifications", label: "Activity", icon: Activity },
];
const workspacePaths = [
  "/dashboard",
  "/calendar",
  "/appointments",
  "/services",
  "/new-appointment",
  "/tasks",
  "/memos",
  "/settings",
  "/messages",
  "/notifications",
  "/my-bookings",
];
export default function AppLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, providerId } = useAuth();
  const client = useQueryClient();
  const { toast } = useToast();
  const [mobile, setMobile] = useState(false);
  const mobilePanel = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState(false);
  const [term, setTerm] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    setMobile(false);
    setSearch(false);
    window.scrollTo(0, 0);
  }, [location]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const logout = async () => {
    setSigningOut(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      await client.cancelQueries();
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/auth/user",
      });
      client.setQueryData(["/api/auth/user"], null);
      navigate("/login");
    } catch {
      toast({
        title: "Could not sign out",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSigningOut(false);
    }
  };
  const workspace = !!user && workspacePaths.includes(location);
  const links = providerId ? providerLinks : clientLinks;
  const name =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Your account";
  const sidebar = (
    <>
      <Link href="/" className="brand sidebar-brand">
        <span className="brand-symbol">
          <CalendarCheck2 size={23} />
        </span>
        BookingPro<span className="brand-period">.</span>
      </Link>
      <div className="workspace-label">
        {providerId ? "PROFESSIONAL WORKSPACE" : "YOUR WORKSPACE"}
      </div>
      <nav aria-label="Workspace navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-link ${location === href ? "active" : ""}`}
            aria-current={location === href ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
            {href === "/calendar" && <span className="nav-shortcut">CAT</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {providerId ? (
          <Link href={`/book/${providerId}`} className="booking-page-link">
            <ExternalLink size={17} />
            Your booking page
          </Link>
        ) : (
          <Link href="/onboarding" className="booking-page-link">
            <BriefcaseBusiness size={17} />
            Offer your services
          </Link>
        )}
        <Link href="/help" className="sidebar-link">
          <HelpCircle size={18} />
          Help centre
        </Link>
        <div className="sidebar-person">
          <Avatar name={name} />
          <div>
            <strong>{name}</strong>
            <small>
              {providerId ? "Professional account" : "Personal account"}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            disabled={signingOut}
            onClick={logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );
  if (!workspace)
    return (
      <div className="public-app">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Navigation />
        <main id="main-content">{children}</main>
        <Footer />
      </div>
    );
  return (
    <div className="workspace-app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="workspace-sidebar" aria-label="Workspace">
        {sidebar}
      </aside>
      <Dialog open={mobile} onOpenChange={setMobile}>
        <DialogContent
          ref={mobilePanel}
          className="mobile-workspace-panel"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            mobilePanel.current?.querySelector("a")?.focus();
          }}
        >
          <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Choose a page in your workspace.
          </DialogDescription>
          {sidebar}
        </DialogContent>
      </Dialog>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="topbar-left">
            <button
              aria-label="Open navigation"
              aria-expanded={mobile}
              className="icon-button mobile-menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span className="topbar-breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>
                {links.find((l) => l.href === location)?.label ??
                  "New appointment"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <button
              onClick={() => setSearch(true)}
              className="search-command"
              aria-label="Search workspace"
            >
              <Search size={17} />
              <span>Go to a page</span>
              <kbd>⌘ K</kbd>
            </button>
            {providerId && (
              <Link
                href="/new-appointment"
                className="btn btn-primary btn-small"
              >
                <Plus size={17} />
                <span>New appointment</span>
              </Link>
            )}
          </div>
        </header>
        <main id="main-content" className="workspace-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>BookingPro workspace</span>
          <span>Malawi time (CAT) · MWK</span>
        </footer>
      </div>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent>
          <DialogTitle>Go to your workspace</DialogTitle>
          <DialogDescription>Search pages and tools.</DialogDescription>
          <label className="field">
            <span className="sr-only">Search pages</span>
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Calendar, appointments, settings…"
            />
          </label>
          <div className="command-results">
            {links
              .filter((l) => l.label.toLowerCase().includes(term.toLowerCase()))
              .map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => {
                    navigate(href);
                    setSearch(false);
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
