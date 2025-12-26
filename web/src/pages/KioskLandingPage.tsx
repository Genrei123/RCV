import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Monitor, 
  Wifi, 
  Zap, 
  Download, 
  Wrench,
  Camera,
  Smartphone,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const carouselImages = [
  {
    title: "RCV Smart Kiosk System",
    description: "Automated certificate verification at your fingertips",
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&h=600&fit=crop"
  },
  {
    title: "Plug & Play Technology",
    description: "Easy setup with minimal technical knowledge required",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&h=600&fit=crop"
  },
  {
    title: "24/7 Self-Service",
    description: "Empower customers with instant certificate verification",
    image: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&h=600&fit=crop"
  }
];

const features = [
  {
    icon: Camera,
    title: "HD QR Scanner",
    description: "High-speed camera with auto-focus for instant QR code scanning"
  },
  {
    icon: Monitor,
    title: "Touch Display",
    description: "Intuitive 15-inch touchscreen interface for easy navigation"
  },
  {
    icon: Wifi,
    title: "Always Connected",
    description: "Built-in WiFi and Ethernet support for reliable connectivity"
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Powered by Raspberry Pi for quick verification and response"
  }
];

const techFeatures = [
  {
    icon: Wrench,
    title: "Easy Maintenance",
    description: "Modular design allows quick component replacement without specialized tools"
  },
  {
    icon: Smartphone,
    title: "Remote Monitoring",
    description: "Monitor kiosk status, logs, and performance from your admin dashboard"
  },
  {
    icon: CheckCircle,
    title: "Auto Updates",
    description: "Automatic software updates ensure your kiosk always has the latest features"
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "End-to-end encryption and tamper-proof housing for maximum security"
  }
];

export function KioskLandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLDivElement>(null);

  // Add CSS animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    }, observerOptions);

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }
    if (techRef.current) {
      observer.observe(techRef.current);
    }
    if (specsRef.current) {
      observer.observe(specsRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const handleDownloadManual = () => {
    // TODO: Replace with actual manual PDF URL
    toast.info("User manual download will be available soon!");
  };

  const handleDownloadSpec = () => {
    // TODO: Replace with actual spec sheet URL
    toast.info("Technical specifications download will be available soon!");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white shadow-md" 
          : "bg-white/95 backdrop-blur-sm border-b border-gray-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">RCV Kiosk</span>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="cursor-pointer"
              >
                Back to Home
              </Button>
              <Button
                onClick={() => navigate("/get-started")}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all hover:scale-105"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Carousel */}
      <section className="relative h-[600px] mt-16 overflow-hidden">
        {carouselImages.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-black/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-4xl">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl text-gray-200">
                  {slide.description}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-gray-900" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
        >
          <ChevronRight className="h-6 w-6 text-gray-900" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Download Section */}
      <section className="py-12 px-4 bg-blue-50 border-y border-blue-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Need Technical Documentation?
              </h3>
              <p className="text-gray-600">
                Download our comprehensive manuals and technical specifications
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleDownloadManual}
                variant="outline"
                className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                User Manual
              </Button>
              <Button
                onClick={handleDownloadSpec}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Download className="h-4 w-4 mr-2" />
                Tech Specs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section 
        ref={featuresRef}
        className="py-20 px-4 opacity-0 translate-y-10 transition-all duration-1000 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Hardware Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built with cutting-edge technology for reliable performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technician-Friendly Section */}
      <section 
        ref={techRef}
        className="py-20 px-4 bg-gray-50 opacity-0 translate-y-10 transition-all duration-1000 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Technician-Friendly Design
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Designed for easy deployment, maintenance, and troubleshooting
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {techFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section 
        ref={specsRef}
        className="py-20 px-4 opacity-0 translate-y-10 transition-all duration-1000 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Technical Specifications
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional-grade hardware built to last
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-3">
                Hardware
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Processor</span>
                  <span className="font-semibold text-gray-900">Raspberry Pi 4B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RAM</span>
                  <span className="font-semibold text-gray-900">4GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage</span>
                  <span className="font-semibold text-gray-900">32GB microSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Display</span>
                  <span className="font-semibold text-gray-900">15" Touchscreen</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Camera</span>
                  <span className="font-semibold text-gray-900">5MP Auto-focus</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-3">
                Connectivity & Power
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">WiFi</span>
                  <span className="font-semibold text-gray-900">802.11ac</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ethernet</span>
                  <span className="font-semibold text-gray-900">Gigabit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">USB Ports</span>
                  <span className="font-semibold text-gray-900">4x USB 3.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Power</span>
                  <span className="font-semibold text-gray-900">5V/3A USB-C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dimensions</span>
                  <span className="font-semibold text-gray-900">400x300x150mm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Deploy Your Kiosk?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Contact us today to learn more about our kiosk solutions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/contact")}
              className="bg-white text-blue-600 hover:bg-gray-100 cursor-pointer"
              size="lg"
            >
              Contact Sales
            </Button>
            <Button
              onClick={() => navigate("/get-started")}
              variant="outline"
              className="border-white text-white hover:bg-blue-700 cursor-pointer"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold text-white">RCV Kiosk</span>
          </div>
          <p className="mb-4">© 2025 Register & Certify Verification. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6">
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="/contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
