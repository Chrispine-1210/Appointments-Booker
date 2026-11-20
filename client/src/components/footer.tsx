import { Link } from "wouter";
import { CalendarCheck2 } from "lucide-react";
export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="public-container footer-grid">
        <div>
          <Link href="/" className="brand">
            <span className="brand-symbol">
              <CalendarCheck2 size={22} />
            </span>
            BookingPro
          </Link>
          <p>
            Make time for what you do best.
            <br />
            Appointments, thoughtfully organised.
          </p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/find">Find a professional</Link>
          <Link href="/login?mode=register&intent=provider">
            For professionals
          </Link>
          <Link href="/about">About BookingPro</Link>
        </div>
        <div>
          <h2>Help & information</h2>
          <Link href="/help">Help centre</Link>
          <Link href="/contact">Appointment support</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms of use</Link>
        </div>
      </div>
      <div className="public-container footer-bottom">
        <span>© {new Date().getFullYear()} BookingPro</span>
        <span>Times in Malawi · Prices in MWK.</span>
      </div>
    </footer>
  );
}
