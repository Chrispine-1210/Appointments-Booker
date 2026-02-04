import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">BookingPro</h3>
            <p className="text-sm text-slate-400">Professional appointment scheduling made simple.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/find"><button className="hover:text-white transition-colors">Find Professionals</button></Link></li>
              <li><Link href="/about"><button className="hover:text-white transition-colors">About</button></Link></li>
              <li><Link href="/help"><button className="hover:text-white transition-colors">Help & FAQ</button></Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact"><button className="hover:text-white transition-colors">Contact</button></Link></li>
              <li><Link href="/privacy"><button className="hover:text-white transition-colors">Privacy</button></Link></li>
              <li><Link href="/terms"><button className="hover:text-white transition-colors">Terms</button></Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>Email: support@bookingpro.com</li>
              <li>Phone: +1 (555) 123-4567</li>
              <li>Hours: 9AM - 6PM PST</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-slate-400">&copy; 2025 BookingPro. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
