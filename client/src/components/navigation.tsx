import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarCheck2, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user, providerId } = useAuth();
  return (
    <header className="public-nav">
      <div className="public-container nav-inner">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <CalendarCheck2 size={23} />
          </span>
          BookingPro<span className="brand-period">.</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className={open ? "public-links open" : "public-links"}
          onClick={() => setOpen(false)}
        >
          <Link
            href="/find"
            aria-current={location === "/find" ? "page" : undefined}
          >
            Find a professional
          </Link>
          <Link href="/about">For your business</Link>
          <Link href="/help">Help centre</Link>
          <div className="nav-account">
            {user ? (
              <Link
                href={providerId ? "/dashboard" : "/my-bookings"}
                className="btn btn-primary"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link
                  href="/login?mode=register&intent=provider"
                  className="btn btn-primary"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
        <button
          className="icon-button mobile-menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
      </div>
    </header>
  );
}
