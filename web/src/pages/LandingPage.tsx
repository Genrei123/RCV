import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
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
import { Chatbot } from "@/components/Chatbot";
import { useChatbot } from "@/context/ChatbotContext";
import landingData from "@/data/landinginfo.json";
import { SanityService } from "@/services/sanityService";
import { urlFor } from "@/lib/sanity";
import type {
  SanityFeature,
  SanityAboutSection,
  SanityObjective,
  SanityVideoSection,
  SanityBlogPost,
  SanityMobileAppShowcase,
  SanityKioskShowcase,
  SanityCtaSection,
} from "@/lib/sanity";
import { MobileAppShowcase } from "@/components/MobileAppShowcase";
import { KioskShowcase } from "@/components/KioskShowcase";
import { AnimatedDiv } from "@/components/AnimatedDiv";

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
  CheckCircle2,
};

// Fallback data from JSON
const fallbackHeroSlides = landingData.heroSlides;
const fallbackFeatures = landingData.features.map((feature: any) => ({
  ...feature,
  icon: iconMap[feature.icon],
}));
const fallbackObjectives = landingData.objectives.map((objective: any) => ({
  ...objective,
  icon: iconMap[objective.icon],
}));

export function LandingPage() {
  const navigate = useNavigate();
  const [api, setApi] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  );

  // Sanity CMS data with fallbacks
  const [heroSlides, setHeroSlides] = useState<any[]>(fallbackHeroSlides);
  const [features, setFeatures] = useState<any[]>(fallbackFeatures);
  const [aboutSection, setAboutSection] = useState<SanityAboutSection | null>(
    null,
  );
  const [objectives, setObjectives] = useState<any[]>(fallbackObjectives);
  const [videoSection, setVideoSection] = useState<SanityVideoSection | null>(
    null,
  );
  const [featuredBlogs, setFeaturedBlogs] = useState<SanityBlogPost[]>([]);
  const [mobileAppShowcase, setMobileAppShowcase] = useState<
    SanityMobileAppShowcase[]
  >([]);
  const [kioskShowcase, setKioskShowcase] =
    useState<SanityKioskShowcase | null>(null);
  const [ctaSection, setCtaSection] = useState<SanityCtaSection | null>(null);
  const [showcaseView, setShowcaseView] = useState<"mobile" | "kiosk">(
    "mobile",
  );
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [carouselScale, setCarouselScale] = useState(1);
  const [carouselOpacity, setCarouselOpacity] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isExpanded: isChatbotExpanded } = useChatbot();

  // Disable scroll when mobile menu is open
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    if (mobileMenuOpen) {
      // Set overflow hidden on both html and body
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      // Prevent scroll on touch devices
      document.addEventListener("touchmove", preventDefault, {
        passive: false,
      });
      // Prevent scroll on wheel
      document.addEventListener("wheel", preventDefault, { passive: false });
    } else {
      // Reset overflow
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      // Remove event listeners
      document.removeEventListener("touchmove", preventDefault);
      document.removeEventListener("wheel", preventDefault);
    }

    return () => {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      document.removeEventListener("touchmove", preventDefault);
      document.removeEventListener("wheel", preventDefault);
    };
  }, [mobileMenuOpen]);

  // Track scroll position for navbar and carousel animation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show background when scrolled past 50px, transparent only at top
      if (currentScrollY > 50) {
        setNavbarScrolled(true);
      } else {
        setNavbarScrolled(false);
      }

      // Show scroll to top button when scrolled down 500px
      if (currentScrollY > 500) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // Carousel closing animation on scroll
      const maxScroll = 400; // How much scroll before fully "closed"
      const scrollProgress = Math.min(currentScrollY / maxScroll, 1);
      setCarouselScale(1 - scrollProgress * 0.1); // Scale from 1 to 0.9
      setCarouselOpacity(1 - scrollProgress * 0.3); // Opacity from 1 to 0.7
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch data from Sanity CMS
  useEffect(() => {
    const fetchSanityData = async () => {
      try {
        const [
          slides,
          feats,
          about,
          objs,
          video,
          blogs,
          appShowcase,
          kioskData,
          ctaData,
        ] = await Promise.all([
          SanityService.getHeroSlides().catch(() => fallbackHeroSlides),
          SanityService.getFeatures().catch(() => []),
          SanityService.getAboutSection().catch(() => null),
          SanityService.getObjectives().catch(() => []),
          SanityService.getVideoSection().catch(() => null),
          SanityService.getFeaturedBlogPosts(3).catch(() => []),
          SanityService.getMobileAppShowcase().catch(() => []),
          SanityService.getKioskShowcase().catch(() => null),
          SanityService.getCtaSection().catch(() => null),
        ]);

        console.log("Slides: ", slides);

        // Process hero slides with media URLs
        const processedSlides =
          slides.length > 0
            ? slides.map((slide: any) => ({
                title: slide.title,
                subtitle: slide.subtitle,
                description: slide.description,
                gradient: slide.gradient,
                buttonLink: slide.buttonLink,
                buttonText: slide.buttonText,
                image:
                  slide.mediaType === "video" && slide.video?.asset?.url
                    ? slide.video.asset.url
                    : slide.image?.asset
                      ? urlFor(slide.image).url()
                      : "/logo_inv.svg",
                isVideo: slide.mediaType === "video",
              }))
            : fallbackHeroSlides;

        // Process features with icons
        const processedFeatures =
          feats.length > 0
            ? feats.map((feat: SanityFeature) => ({
                title: feat.title,
                description: feat.description,
                icon: iconMap[feat.icon] || Shield,
                color: feat.color,
              }))
            : fallbackFeatures;

        // Process objectives with icons
        const processedObjectives =
          objs.length > 0
            ? objs.map((obj: SanityObjective) => ({
                title: obj.title,
                description: obj.description,
                icon: iconMap[obj.icon] || Shield,
              }))
            : fallbackObjectives;

        setHeroSlides(processedSlides);
        setFeatures(processedFeatures);
        setAboutSection(about);
        setVideoSection(video);
        setObjectives(processedObjectives);
        setFeaturedBlogs(blogs);
        setMobileAppShowcase(appShowcase);
        setKioskShowcase(kioskData);
        setCtaSection(ctaData);
      } catch (error) {
        console.error("Error fetching Sanity data:", error);
        // Keep fallback data
      }
    };

    fetchSanityData();
  }, []);

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
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navbarScrolled
            ? "bg-white/95 backdrop-blur-sm border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        {/* Header Backdrop Overlay when menu is open */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 bg-black/30 md:hidden z-0 pointer-events-none" />
        )}

        <div
          className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 transition-all duration-300 ${!navbarScrolled ? "lg:mt-10" : ""}`}
        >
          <div className="flex items-center justify-between h-16">
            {/* Logo - Left */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img
                src={navbarScrolled ? "/logo_inv.svg" : "/logo.png"}
                alt="RCV Logo"
                className="h-10 w-10 transition-all duration-300"
                draggable="false"
              />
              <div className="flex flex-col">
                <span
                  className={`font-bold text-lg leading-tight transition-colors duration-300 ${
                    navbarScrolled ? "app-text-primary" : "text-white"
                  }`}
                >
                  RCV
                </span>
                <span
                  className={`text-[10px] leading-tight uppercase tracking-wider transition-colors duration-300 ${
                    navbarScrolled ? "app-text-primary" : "text-white/80"
                  }`}
                >
                  Regulatory Compliance Verification
                </span>
              </div>
            </div>

            {/* Nav Links - Center (Hidden on mobile) */}
            <div className="hidden lg:flex items-center flex-1 justify-center gap-8">
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`text-sm transition-colors cursor-pointer uppercase tracking-wider font-medium ${
                  navbarScrolled
                    ? "text-text hover:text-primary"
                    : "text-white/90 hover:text-white"
                }`}
              >
                Features
              </a>
              <a
                href="#transparency"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("transparency")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`text-sm transition-colors cursor-pointer uppercase tracking-wider font-medium ${
                  navbarScrolled
                    ? "text-text hover:text-primary"
                    : "text-white/90 hover:text-white"
                }`}
              >
                Transparency
              </a>
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("about")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`text-sm transition-colors cursor-pointer uppercase tracking-wider font-medium ${
                  navbarScrolled
                    ? "text-text hover:text-primary"
                    : "text-white/90 hover:text-white"
                }`}
              >
                About
              </a>
              <a
                href="#mission"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("mission")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`text-sm transition-colors cursor-pointer uppercase tracking-wider font-medium ${
                  navbarScrolled
                    ? "text-text hover:text-primary"
                    : "text-white/90 hover:text-white"
                }`}
              >
                Our Mission
              </a>
            </div>

            {/* Get Started Button + Hamburger - Right */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Button
                onClick={() => navigate("/login")}
                className={`hidden sm:block transition-all duration-300 ${
                  navbarScrolled
                    ? "app-bg-primary hover:app-bg-secondary app-text-white px-6 hover:text-white cursor-pointer"
                    : "app-bg-primary hover:app-bg-secondary app-text-white px-6 hover:text-white cursor-pointer"
                }`}
              >
                Get Started
              </Button>

              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2"
              >
                <svg
                  className={`w-6 h-6 transition-colors duration-300 ${
                    navbarScrolled ? "text-gray-800" : "text-white"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Sliding Drawer Menu */}
          <div
            className={`fixed top-0 right-0 h-screen w-64 bg-white shadow-2xl lg:hidden z-40 transform transition-transform duration-300 ease-out overflow-y-auto ${
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header with Title and Close Button */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Menu</h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-6 py-6 space-y-4">
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                  setMobileMenuOpen(false);
                }}
                className="block py-3 text-sm uppercase tracking-wider font-medium text-gray-800 hover:text-primary transition-colors cursor-pointer"
              >
                Features
              </a>
              <a
                href="#transparency"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("transparency")
                    ?.scrollIntoView({ behavior: "smooth" });
                  setMobileMenuOpen(false);
                }}
                className="block py-3 text-sm uppercase tracking-wider font-medium text-gray-800 hover:text-primary transition-colors cursor-pointer"
              >
                Transparency
              </a>
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("about")
                    ?.scrollIntoView({ behavior: "smooth" });
                  setMobileMenuOpen(false);
                }}
                className="block py-3 text-sm uppercase tracking-wider font-medium text-gray-800 hover:text-primary transition-colors cursor-pointer"
              >
                About
              </a>
              <a
                href="#mission"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("mission")
                    ?.scrollIntoView({ behavior: "smooth" });
                  setMobileMenuOpen(false);
                }}
                className="block py-3 text-sm uppercase tracking-wider font-medium text-gray-800 hover:text-primary transition-colors cursor-pointer"
              >
                Our Mission
              </a>
              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    navigate("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full transition-all duration-300 app-bg-primary hover:app-bg-secondary app-text-white hover:text-white cursor-pointer mt-2"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Backdrop Overlay - Outside navbar for proper z-index */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/75 md:hidden z-30 pointer-events-auto"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Hero Carousel - Full Width with Closing Animation */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          transform: `scale(${carouselScale})`,
          opacity: carouselOpacity,
          transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
          borderRadius: `${(1 - carouselScale) * 200}px`,
        }}
      >
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[autoplayRef.current]}
          className="w-full relative h-screen"
        >
          <CarouselContent className="m-0">
            {heroSlides.map((slide, index) => (
              <CarouselItem key={index} className="p-0">
                <div className="relative h-screen overflow-hidden">
                  {/* Background Image/Video */}
                  <div
                    className="absolute inset-0 z-0"
                    style={{ boxShadow: "inset 0 30px 40px rgba(0,0,0,0.5)" }}
                  >
                    {slide.isVideo ? (
                      <video
                        src={slide.image}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent z-10"></div>

                  {/* Content */}
                  <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex items-center h-full">
                      {/* Text Content */}
                      <div className="flex-1 text-center md:text-left pt-8 md:pt-0 w-full px-4 sm:px-0 md:px-20 lg:px-24 max-w-3xl">
                        <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                          {slide.subtitle}
                        </span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                          {slide.title}
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 max-w-xl">
                          {slide.description}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                          {slide.buttonLink && slide.buttonText && (
                            <Button
                              onClick={() => navigate("/login")}
                              className="app-bg-primary hover:app-bg-secondary text-white font-semibold px-8 shadow-lg hover:shadow-xl cursor-pointer w-full sm:w-auto transition-all"
                              size="lg"
                            >
                              {slide.buttonText}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="lg"
                            className="hidden sm:flex border-2 border-white bg-transparent text-white hover:bg-white/10 cursor-pointer transition-colors w-full sm:w-auto hover:text-white"
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

      {/* Video Section */}
      {videoSection && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              {videoSection.subtitle && (
                <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
                  {videoSection.subtitle}
                </span>
              )}
              <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
                {videoSection.title}
              </h2>
              {videoSection.description && (
                <p className="text-lg text-text-subtle max-w-2xl mx-auto">
                  {videoSection.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Video Player */}
              <div className="lg:col-span-2">
                <AnimatedDiv
                  animationClass="animate-fade-in-left"
                  threshold={0.2}
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
                    <video
                      src={videoSection.video.asset.url}
                      controls
                      poster={
                        videoSection.thumbnail?.asset
                          ? urlFor(videoSection.thumbnail).url()
                          : undefined
                      }
                      className="w-full h-full object-cover"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </AnimatedDiv>
              </div>

              {/* Infographic Card */}
              <div className="lg:col-span-1">
                <AnimatedDiv
                  animationClass="animate-fade-in-right"
                  threshold={0.2}
                >
                  <Card className="p-6 h-full bg-linear-to-br from-app-primary/10 to-app-secondary/10 border-app-primary/20 hover:shadow-lg transition-shadow flex flex-col">
                    <h3 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
                      Inside the Trailer
                    </h3>

                    <p className="text-text-subtle leading-relaxed grow mb-6">
                      The RCV trailer is equipped with cutting-edge technology
                      designed for regulatory compliance verification. It
                      features advanced camera systems for high-resolution
                      document capture and OCR processing, intelligent LED
                      displays for real-time guidance, and secure
                      blockchain-integrated processing to ensure tamper-proof
                      compliance records.
                    </p>

                    {/* Footer CTA */}
                    <div className="pt-4 border-t border-app-primary/20">
                      <Button
                        onClick={() => navigate("/login")}
                        className="w-full app-bg-primary hover:app-bg-secondary text-white font-medium"
                      >
                        Explore More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                </AnimatedDiv>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Showcase Section with Toggle */}
      {(mobileAppShowcase.length > 0 || kioskShowcase) && (
        <section className="py-20 app-bg-neutral-soft">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Toggle Buttons */}
            {mobileAppShowcase.length > 0 && kioskShowcase && (
              <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-lg bg-white p-1 shadow-md">
                  <button
                    onClick={() => setShowcaseView("mobile")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                      showcaseView === "mobile"
                        ? "app-bg-primary text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Mobile App</span>
                  </button>
                  <button
                    onClick={() => setShowcaseView("kiosk")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                      showcaseView === "kiosk"
                        ? "app-bg-primary text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span>Kiosk Machine</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile App Showcase */}
          {showcaseView === "mobile" && mobileAppShowcase.length > 0 && (
            <MobileAppShowcase data={mobileAppShowcase} />
          )}

          {/* Kiosk Showcase */}
          {showcaseView === "kiosk" && kioskShowcase && (
            <KioskShowcase data={kioskShowcase} />
          )}
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-20 app-bg-neutral-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
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
              All our verified products and companies are publicly recorded on
              the blockchain. Every transaction can be independently verified on
              Etherscan.
            </p>
          </div>

          <TransparencyTables />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 app-bg-neutral-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
                {aboutSection?.subtitle || "About RCV"}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold app-text-primary mb-6">
                {aboutSection?.title || "Revolutionizing Product Verification"}
              </h2>
            </div>

            {aboutSection?.description ? (
              aboutSection.description.map((para, index) => (
                <p
                  key={index}
                  className="text-lg text-text-subtle mb-6 leading-relaxed text-center"
                >
                  {para}
                </p>
              ))
            ) : (
              <>
                <p className="text-lg text-text-subtle mb-6 leading-relaxed text-center">
                  The Regulatory Compliance Verification (RCV) system is a
                  cutting-edge platform designed to combat counterfeiting and
                  ensure product authenticity through blockchain technologies.
                </p>
                <p className="text-lg text-text-subtle mb-8 leading-relaxed text-center">
                  Our system provides businesses with the tools to register
                  products, generate tamper-proof certificates, and enable
                  consumers to verify authenticity with a simple QR code scan.
                </p>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {(
                aboutSection?.highlights || [
                  "Blockchain-secured certificates",
                  "Real-time verification",
                  "Comprehensive analytics",
                  "Regulatory compliance tracking",
                ]
              ).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 app-text-primary"
                >
                  <div className="w-6 h-6 app-bg-primary-soft rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-text">{item}</span>
                </div>
              ))}
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

      {/* Featured 
      Section */}
      {featuredBlogs.length > 0 && (
        <section className="py-20 app-bg-neutral-soft">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
                Latest Insights
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
                Featured Blog Posts
              </h2>
              <p className="text-lg text-text-subtle max-w-2xl mx-auto">
                Stay updated with the latest trends and insights in product
                verification and compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredBlogs.map((post) => (
                <Card
                  key={post._id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border app-border-neutral hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  onClick={() => navigate(`/blog/${post.slug.current}`)}
                >
                  {/* Blog Image/Video */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {post.featuredVideo?.asset?.url ? (
                      <video
                        src={post.featuredVideo.asset.url}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        muted
                        loop
                        playsInline
                      />
                    ) : post.mainImage ? (
                      <img
                        src={urlFor(post.mainImage).url()}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileCheck className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    {/* Featured Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 app-bg-primary text-white text-xs font-semibold rounded-full">
                        Featured
                      </span>
                    </div>
                  </div>

                  {/* Blog Content */}
                  <div className="p-6">
                    {/* Categories */}
                    {post.categories && post.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.categories.slice(0, 2).map((category) => (
                          <span
                            key={category._id}
                            className="px-2 py-1 app-bg-primary-soft app-text-primary text-xs font-medium rounded"
                          >
                            {category.title}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-text mb-3 line-clamp-2 group-hover:app-text-primary transition-colors">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-text-subtle text-sm mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Author & Date */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {post.author.image && (
                          <img
                            src={urlFor(post.author.image)
                              .width(32)
                              .height(32)
                              .url()}
                            alt={post.author.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <span className="text-sm text-text-subtle font-medium">
                          {post.author.name}
                        </span>
                      </div>
                      <span className="text-xs text-text-subtle">
                        {new Date(post.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* View All Blogs Button */}
            <div className="text-center mt-12">
              <Button
                onClick={() => navigate("/blog")}
                variant="outline"
                size="lg"
                className="app-border-primary app-text-primary hover:bg-primary hover:text-white transition-all"
              >
                View All Blog Posts
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section
        className="py-20 app-bg-white"
        style={
          ctaSection?.sectionBackground
            ? { background: ctaSection.sectionBackground }
            : undefined
        }
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold app-text-primary mb-4">
            {ctaSection?.title || "Ready to Get Started?"}
          </h2>
          <p className="text-lg app-text-text/80 mb-8 max-w-2xl mx-auto">
            {ctaSection?.description ||
              "Start to verify your products and ensure compliance today with RCV."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {ctaSection?.buttons && ctaSection.buttons.length > 0 ? (
              ctaSection.buttons.map((button) => (
                <Button
                  key={button._key}
                  onClick={() => {
                    if (button.linkType === "internal") {
                      navigate(button.href);
                    } else if (button.linkType === "external") {
                      if (button.openInNewTab) {
                        window.open(
                          button.href,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      } else {
                        window.location.href = button.href;
                      }
                    } else if (button.linkType === "scroll") {
                      document
                        .getElementById(button.href)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  size="lg"
                  variant={
                    button.variant === "outline"
                      ? "outline"
                      : button.variant === "ghost"
                        ? "ghost"
                        : "default"
                  }
                  className={[
                    "px-8 cursor-pointer transition-all",
                    button.backgroundColor?.startsWith("bg-")
                      ? button.backgroundColor
                      : button.variant === "primary" || !button.variant
                        ? "app-bg-primary-light hover:bg-[#009b79]"
                        : "",
                    button.textColor?.startsWith("text-")
                      ? button.textColor
                      : button.variant === "primary" || !button.variant
                        ? "app-text-text"
                        : "",
                    button.variant === "outline"
                      ? "app-border-primary app-text-primary hover:app-bg-primary hover:text-white"
                      : "",
                    button.variant === "ghost"
                      ? "app-text-primary hover:app-bg-primary-soft"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    ...(button.backgroundColor &&
                    !button.backgroundColor.startsWith("bg-")
                      ? { backgroundColor: button.backgroundColor }
                      : {}),
                    ...(button.textColor &&
                    !button.textColor.startsWith("text-")
                      ? { color: button.textColor }
                      : {}),
                  }}
                >
                  {button.label}
                  {button.showArrow && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              ))
            ) : (
              <Button
                onClick={() => navigate("/login")}
                size="lg"
                className="app-bg-primary-light hover:bg-[#009b79] app-text-text px-8 cursor-pointer"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <Footer />
      <Chatbot />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-8 left-8 p-4 app-bg-primary hover:app-bg-secondary text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group backdrop-blur-sm ${isChatbotExpanded ? "z-30" : "z-50"}`}
          aria-label="Scroll to top"
        >
          <svg
            className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
