import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin} from "lucide-react";

export function Footer() {
  return (
    <footer className="app-bg-primary text-white border-t border-[color:var(--app-primary)] w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center justify-items-center text-center">
            {/* Logo Section */}
            <div className="flex flex-col items-center md:items-start">
              <div className="w-12 h-12 mb-3">
                <img
                  src="logo.svg"
                  alt="RCV System logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <h3 className="text-lg font-bold">RCV System</h3>
              <p className="text-white/80 text-sm">
                Product Verification Platform
              </p>
            </div>

            {/* Navigation Links */}
            <div>
              <h4 className="font-semibold text-white mb-3">Explore</h4>
              <div className="space-y-2">
                <Link
                  to="/About"
                  className="block text-white/80 hover:text-white transition-colors text-sm"
                >
                  About Us
                </Link>
                <Link
                  to="/contact"
                  className="block text-white/80 hover:text-white transition-colors text-sm"
                >
                  Contact
                </Link>
                <Link
                  to="/privacy"
                  className="block text-white/80 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="block text-white/80 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="font-semibold text-white mb-3">Connect with us</h4>
              <div className="flex justify-center md:justify-start space-x-4 flex-wrap">
                <a
                  href="https://www.facebook.com/profile.php?id=61584477608125"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 app-bg-primary rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-colors"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 app-bg-primary rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-colors"
                  aria-label="X (Twitter)"
                  title="X (Twitter)"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 app-bg-primary rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-colors"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-[color:var(--app-primary)] mt-8 pt-6 text-center w-full">
            <p className="text-sm text-white/80">
              &copy; {new Date().getFullYear()} Proof of Vision All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
