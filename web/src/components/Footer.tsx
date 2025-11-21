import { Link } from "react-router-dom";

export function Footer() {
    // Use brand primary green for footer background (matches AppColors.primary: #005440)
    return (
        <footer className="bg-[#005440] text-white border-t border-[#003d30] w-full">
            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                        {/* Logo Section */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-3">
                                {/* Inner diamond also uses primary green to match brand */}
                                <div className="w-8 h-8 bg-[#005440] rounded transform rotate-45"></div>
                            </div>
                            <h3 className="text-lg font-bold">RCV System</h3>
                            <p className="text-[#B3D4FF] text-sm">Product Verification Platform</p>
                        </div>

                        {/* Navigation Links */}
                        <div>
                            <h4 className="font-semibold text-white mb-3">Explore</h4>
                            <div className="space-y-2">
                                <Link to="/about" className="block text-[#B3D4FF] hover:text-white transition-colors text-sm">
                                    About Us
                                </Link>
                                <Link to="/contact" className="block text-[#B3D4FF] hover:text-white transition-colors text-sm">
                                    Contact
                                </Link>
                                <Link to="/privacy" className="block text-[#B3D4FF] hover:text-white transition-colors text-sm">
                                    Privacy Policy
                                </Link>
                                <Link to="/terms" className="block text-[#B3D4FF] hover:text-white transition-colors text-sm">
                                    Terms of Service
                                </Link>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div>
                            <h4 className="font-semibold text-white mb-3">Connect with us</h4>
                            <div className="flex justify-center md:justify-start space-x-4">
                                <a 
                                    href="https://facebook.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-10 h-10 bg-[#003d30] rounded-lg flex items-center justify-center text-white hover:bg-[#00BA8E] transition-colors"
                                >
                                    <i className="fab fa-facebook-f"></i>
                                </a>
                                <a 
                                    href="https://twitter.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-10 h-10 bg-[#003d30] rounded-lg flex items-center justify-center text-white hover:bg-[#00BA8E] transition-colors"
                                >
                                    <i className="fab fa-twitter"></i>
                                </a>
                                <a 
                                    href="https://linkedin.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-10 h-10 bg-[#003d30] rounded-lg flex items-center justify-center text-white hover:bg-[#00BA8E] transition-colors"
                                >
                                    <i className="fab fa-linkedin-in"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="border-t border-[#003d30] mt-8 pt-6 text-center">
                        <p className="text-sm text-[#B3D4FF]">
                            &copy; {new Date().getFullYear()} RCV System. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}