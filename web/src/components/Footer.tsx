import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-teal-700 text-white border-t border-teal-600 w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-left">
            {/* Logo Section */}
            <div className="flex flex-col items-center md:items-start">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-3">
                <div className="w-8 h-8 bg-teal-600 rounded transform rotate-45"></div>
              </div>
              <h3 className="text-lg font-bold">RCV System</h3>
              <p className="text-teal-200 text-sm">
                Product Verification Platform
              </p>
            </div>

            {/* Navigation Links */}
            <div>
              <h4 className="font-semibold text-white mb-3">Explore</h4>
              <div className="space-y-2">
                <Link
                  to="/about"
                  className="block text-teal-200 hover:text-white transition-colors text-sm"
                >
                  About Us
                </Link>
                <Link
                  to="/contact"
                  className="block text-teal-200 hover:text-white transition-colors text-sm"
                >
                  Contact
                </Link>
                <Link
                  to="/privacy"
                  className="block text-teal-200 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="block text-teal-200 hover:text-white transition-colors text-sm"
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
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white hover:bg-teal-500 transition-colors"
                >
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white hover:bg-teal-500 transition-colors"
                >
                  <i className="fab fa-twitter"></i>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white hover:bg-teal-500 transition-colors"
                >
                  <i className="fab fa-linkedin-in"></i>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-teal-600 mt-8 pt-6 text-center w-full">
            <p className="text-sm text-teal-200">
              &copy; {new Date().getFullYear()} RCV System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
