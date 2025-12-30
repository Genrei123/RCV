import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  QrCode, 
  Building2, 
  Package, 
  FileCheck, 
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Globe,
  Lock,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hero carousel slides
const heroSlides = [
  {
    title: 'Secure Product Verification',
    subtitle: 'Blockchain-Powered Authenticity',
    description: 'Protect your products and consumers with our advanced blockchain verification system. Every product gets a unique, tamper-proof certificate.',
    image: '/logo.svg',
    gradient: 'from-teal-600 to-emerald-700',
  },
  {
    title: 'Real-Time Compliance',
    subtitle: 'Stay Ahead of Regulations',
    description: 'Monitor and manage regulatory compliance across your entire product portfolio. Get instant alerts and comprehensive reports.',
    image: '/logo.svg',
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    title: 'Instant QR Scanning',
    subtitle: 'Verify in Seconds',
    description: 'Consumers can instantly verify product authenticity by scanning QR codes. Build trust with transparent verification.',
    image: '/logo.svg',
    gradient: 'from-purple-600 to-pink-700',
  },
];

// Feature cards
const features = [
  {
    icon: Shield,
    title: 'Blockchain Security',
    description: 'Every certificate is stored on an immutable blockchain, ensuring tamper-proof verification and complete transparency.',
    color: 'bg-teal-500',
  },
  {
    icon: QrCode,
    title: 'QR Code Verification',
    description: 'Generate unique QR codes for each product that consumers can scan to instantly verify authenticity.',
    color: 'bg-blue-500',
  },
  {
    icon: Building2,
    title: 'Company Management',
    description: 'Register and manage companies, track their products, and maintain comprehensive compliance records.',
    color: 'bg-purple-500',
  },
  {
    icon: Package,
    title: 'Product Tracking',
    description: 'Track products from registration to distribution. Monitor lot numbers, expiration dates, and certifications.',
    color: 'bg-orange-500',
  },
  {
    icon: FileCheck,
    title: 'Digital Certificates',
    description: 'Generate professional PDF certificates with all product details and QR codes for offline verification.',
    color: 'bg-green-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Gain insights with powerful analytics. Track scans, monitor compliance rates, and identify trends.',
    color: 'bg-indigo-500',
  },
];

// What we aim to do items
const objectives = [
  {
    icon: Lock,
    title: 'Combat Counterfeiting',
    description: 'Our blockchain-based system makes it virtually impossible for counterfeit products to pass verification, protecting both businesses and consumers.',
  },
  {
    icon: Globe,
    title: 'Enable Transparency',
    description: 'Create a transparent ecosystem where product information is accessible and verifiable by anyone, anywhere, at any time.',
  },
  {
    icon: Smartphone,
    title: 'Simplify Verification',
    description: 'Make product verification as easy as scanning a QR code. No special equipment needed - just a smartphone.',
  },
  {
    icon: Zap,
    title: 'Streamline Compliance',
    description: 'Help businesses stay compliant with regulatory requirements through automated tracking and instant reporting.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.svg" 
                alt="RCV Logo" 
                className="h-10 w-10"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg text-[#005440] leading-tight">RCV</span>
                <span className="text-[10px] text-gray-500 leading-tight">Regulatory Compliance Verification</span>
              </div>
            </div>

            {/* Nav Links - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-[#005440] transition-colors">
                Features
              </a>
              <a href="#about" className="text-sm text-gray-600 hover:text-[#005440] transition-colors">
                About
              </a>
              <a href="#mission" className="text-sm text-gray-600 hover:text-[#005440] transition-colors">
                Our Mission
              </a>
            </div>

            {/* Get Started Button */}
            <Button 
              onClick={() => navigate('/login')}
              className="bg-[#005440] hover:bg-[#004030] text-white px-6"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Carousel */}
      <section className="pt-16 relative overflow-hidden">
        <div className="relative h-[600px] md:h-[700px]">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentSlide 
                  ? 'opacity-100 translate-x-0' 
                  : index < currentSlide 
                    ? 'opacity-0 -translate-x-full' 
                    : 'opacity-0 translate-x-full'
              }`}
            >
              <div className={`h-full bg-gradient-to-br ${slide.gradient}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                  <div className="flex flex-col md:flex-row items-center justify-center h-full gap-8 md:gap-16">
                    {/* Text Content */}
                    <div className="flex-1 text-center md:text-left pt-8 md:pt-0">
                      <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                        {slide.subtitle}
                      </span>
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                        {slide.title}
                      </h1>
                      <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
                        {slide.description}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Button 
                          onClick={() => navigate('/login')}
                          size="lg"
                          className="bg-white text-gray-900 hover:bg-gray-100 px-8"
                        >
                          Get Started Free
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button 
                          variant="outline"
                          size="lg"
                          className="border-white/50 text-white hover:bg-white/10 px-8"
                          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Learn More
                        </Button>
                      </div>
                    </div>

                    {/* Image/Illustration */}
                    <div className="flex-1 flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl scale-150" />
                        <img 
                          src={slide.image} 
                          alt="RCV" 
                          className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Carousel Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Carousel Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white w-8' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-[#005440]/10 rounded-full text-[#005440] text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Compliance
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to manage product verification and regulatory compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 bg-[#005440]/10 rounded-full text-[#005440] text-sm font-medium mb-4">
                About RCV
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Revolutionizing Product Verification
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                The Regulatory Compliance Verification (RCV) system is a cutting-edge platform designed to combat counterfeiting and ensure product authenticity through blockchain technology.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our system provides businesses with the tools to register products, generate tamper-proof certificates, and enable consumers to verify authenticity with a simple QR code scan.
              </p>
              
              <div className="space-y-4">
                {[
                  'Blockchain-secured certificates',
                  'Real-time verification',
                  'Comprehensive analytics',
                  'Regulatory compliance tracking'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#005440]/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-[#005440]" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#005440]/20 to-[#00ba8e]/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-[#005440] to-[#00ba8e] rounded-3xl p-8 md:p-12">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">100K+</div>
                    <div className="text-white/80 text-sm">Products Verified</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">500+</div>
                    <div className="text-white/80 text-sm">Companies</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">1M+</div>
                    <div className="text-white/80 text-sm">QR Scans</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">99.9%</div>
                    <div className="text-white/80 text-sm">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-20 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-white/90 text-sm font-medium mb-4">
              Our Mission
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What We Aim to Achieve
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              We're on a mission to create a world where every product can be verified, every business can prove authenticity, and every consumer can shop with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {objectives.map((objective, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-[#005440] to-[#00ba8e] rounded-xl flex items-center justify-center mb-5">
                  <objective.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {objective.title}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {objective.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using RCV to protect their products and build consumer trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/login')}
              size="lg"
              className="bg-[#005440] hover:bg-[#004030] text-white px-8"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8"
              onClick={() => navigate('/contact')}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/logo.svg" 
                  alt="RCV Logo" 
                  className="h-10 w-10 brightness-0 invert"
                />
                <div>
                  <span className="font-bold text-lg text-white">RCV</span>
                  <p className="text-xs text-gray-400">Regulatory Compliance Verification</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Empowering businesses with blockchain-powered product verification and regulatory compliance solutions.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-gray-400 hover:text-white text-sm transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#mission" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Our Mission
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} RCV - Regulatory Compliance Verification. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
