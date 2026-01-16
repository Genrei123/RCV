import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Zap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Footer } from "@/components/Footer";
import { TransparencyTables } from "@/components/TransparencyTables";
import landingData from "@/data/landinginfo.json";

// Icon map for dynamic rendering
const iconMap: Record<string, React.ComponentType<any>> = {
  Shield,
  QrCode,
  Building2,
  Package,
  FileCheck,
  BarChart3,
  Lock,
  Globe,
  Smartphone,
  Zap,
};

const heroSlides = landingData.heroSlides;
const features = landingData.features.map((feature: any) => ({
  ...feature,
  icon: iconMap[feature.icon],
}));
const objectives = landingData.objectives.map((objective: any) => ({
  ...objective,
  icon: iconMap[objective.icon],
}));

export function LandingPage() {
  const navigate = useNavigate();
  const [api, setApi] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Monitor carousel slides
  useEffect(() => {
    if (!api) return;

    const updateSlide = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };

    api.on("select", updateSlide);
    updateSlide();

    return () => {
      api.off("select", updateSlide);
    };
  }, [api]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo_inv.svg" alt="RCV Logo" className="h-10 w-10" />
              <div className="flex flex-col">
                <span className="font-bold text-lg app-text-primary leading-tight">
                  RCV
                </span>
                <span className="text-[10px] app-text-primary leading-tight">
                  Regulatory Compliance Verification
                </span>
              </div>
            </div>

            {/* Nav Links - Hidden on mobile */}
            <div className="ml-0 hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-text hover:text-primary transition-colors"
              >
                Features
              </a>
              <a
                href="#transparency"
                className="text-sm text-text hover:text-primary transition-colors"
              >
                Transparency
              </a>
              <a
                href="#about"
                className="text-sm text-text hover:text-muted transition-colors"
              >
                About
              </a>
              <a
                href="#mission"
                className="text-sm text-text hover:text-muted transition-colors"
              >
                Our Mission
              </a>
              {/* Get Started Button */}
              <Button
                onClick={() => navigate("/login")}
                className="app-bg-primary hover:bg-[#009b79] app-text-white px-6 hover:text-white cursor-pointer"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Carousel */}
      <section className="pt-16 relative w-full">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full relative"
        >
          <CarouselContent className="m-0">
            {heroSlides.map((slide, index) => (
              <CarouselItem key={index} className="p-0">
                <div className={`h-100 md:h-175 bg-linear-to-br ${slide.gradient}`}>
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex flex-col md:flex-row items-center justify-center h-full gap-8 md:gap-16">
                      {/* Text Content */}
                      <div className="flex-1 text-center md:text-left pt-8 md:pt-0 w-full px-4 sm:px-0 md:px-20 lg:px-24">
                        <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                          {slide.subtitle}
                        </span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight max-w-lg mx-auto md:mx-0">
                          {slide.title}
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-text /90 mb-8 text-white max-w-sm sm:max-w-xl mx-auto md:mx-0">
                          {slide.description}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start max-w-sm sm:max-w-none mx-auto md:mx-0">
                          <Button
                            onClick={() => navigate("/login")}
                            size="lg"
                            className="app-bg-neutral hover:app-bg-muted-90 hover:text-white border-white text-text px-8 cursor-pointer w-full sm:w-auto"
                          >
                            Get Started Free
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                            <Button
                            variant="outline"
                            size="lg"
                            className="border app-border-neutral bg-transparent app-text-white cursor-pointer transition-colors w-full sm:w-auto overflow-hidden hidden sm:inline-flex"
                            onClick={() =>
                              document
                              .getElementById("features")
                              ?.scrollIntoView({ behavior: "smooth" })
                            }
                            >
                            Learn More
                            </Button>
                        </div>
                      </div>

                      {/* Image/Illustration */}
                      <div className="hidden md:flex-1 justify-center  lg:flex">
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
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Arrows */}
          <CarouselPrevious className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-(--app-white) backdrop-blur-md border border-white/20 hover:border-white/40 text-white h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300" />
          <CarouselNext className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-(--app-white) backdrop-blur-md border border-white/20 hover:border-white/40 text-white h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300" />

          {/* Carousel Indicators */}
          <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 justify-center gap-2 z-20">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide
                    ? "bg-white w-8"
                    : "bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 app-bg-neutral-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text  mb-4">
              Everything You Need for Compliance
            </h2>
            <p className="text-lg text-text -subtle max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to
              manage product verification and regulatory compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border app-border-neutral hover:shadow-lg hover:border-gray-200 transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-text  mb-3">
                  {feature.title}
                </h3>
                <p className="text-text -subtle leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency Section - Public Blockchain Records */}
      <section id="transparency" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
              <Eye className="h-4 w-4 inline-block mr-1" />
              Transparency
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Blockchain-Verified Records
            </h2>
            <p className="text-lg text-text-subtle max-w-2xl mx-auto">
              All our verified products and companies are publicly recorded on the blockchain. 
              Every transaction can be independently verified on Etherscan.
            </p>
          </div>

          <TransparencyTables />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 app-bg-neutral-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
                About RCV
              </span>
              <h2 className="text-3xl md:text-4xl font-bold app-text-primary mb-6">
                Revolutionizing Product Verification
              </h2>
              <p className="text-lg text-text -subtle mb-6 leading-relaxed">
                The Regulatory Compliance Verification (RCV) system is a
                cutting-edge platform designed to combat counterfeiting and
                ensure product authenticity through blockchain technology.
              </p>
              <p className="text-lg text-text -subtle mb-8 leading-relaxed">
                Our system provides businesses with the tools to register
                products, generate tamper-proof certificates, and enable
                consumers to verify authenticity with a simple QR code scan.
              </p>

              <div className="space-y-4 app-text-primary">
                {[
                  "Blockchain-secured certificates",
                  "Real-time verification",
                  "Comprehensive analytics",
                  "Regulatory compliance tracking",
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 app-text-primary"
                  >
                    <div className="w-6 h-6 app-bg-primary-soft rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-text -primary" />
                    </div>
                    <span className="text-text ">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-(--app-primary)/20 to-(--app-primary-light)/20 rounded-3xl blur-3xl" />
              <div className="relative bg-linear-to-br from-(--app-primary) to-(--app-primary-light) rounded-3xl p-8 md:p-12">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center text-white">
                    <div className="text-4xl font-bold mb-2">100K+</div>
                    <div className="text-text /80 text-sm">
                      Products Verified
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center text-white">
                    <div className="text-4xl font-bold text-text mb-2">
                      500+
                    </div>
                    <div className="text-text /80 text-sm">Companies</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center text-white">
                    <div className="text-4xl font-bold text-text mb-2">1M+</div>
                    <div className="text-text /80 text-sm">QR Scans</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center text-white">
                    <div className="text-4xl font-bold text-text mb-2">
                      99.9%
                    </div>
                    <div className="text-text /80 text-sm">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-20 bg-linear-to-br app-bg-primary ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-white /90 text-sm font-medium mb-4">
              Our Mission
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white  mb-4">
              What We Aim to Achieve
            </h2>
            <p className="text-lg text-white /70 max-w-2xl mx-auto">
              We're on a mission to create a world where every product can be
              verified, every business can prove authenticity, and every
              consumer can shop with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {objectives.map((objective, index) => (
              <Card
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors p-8"
              >
                <div className="w-14 h-14 bg-linear-to-br from-(--app-primary) to-(--app-primary-light) rounded-xl flex items-center justify-center mb-5">
                  <objective.icon className="h-7 w-7 text-white " />
                </div>
                <h3 className="text-xl font-semibold text-white  mb-3">
                  {objective.title}
                </h3>
                <p className="text-text /70 leading-relaxed text-white">
                  {objective.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 app-bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold app-text-primary mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg app-text-text/80 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using RCV to protect their
            products and build consumer trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/login")}
              size="lg"
              className="app-bg-primary-light hover:bg-[#009b79] app-text-text  px-8  cursor-pointer"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border app-border-primary hover:app-bg-primary-70 hover:text-white app-text-primary cursor-pointer transition-colors"
              onClick={() => navigate("/contact")}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
