import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { urlFor } from "@/lib/sanity";
import type { SanityMobileAppShowcase } from "@/lib/sanity";
import * as LucideIcons from "lucide-react";

interface MobileAppShowcaseProps {
  data: SanityMobileAppShowcase[];
}

export function MobileAppShowcase({ data }: MobileAppShowcaseProps) {
  const [currentDocument, setCurrentDocument] = useState(0);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  if (!data || data.length === 0) return null;

  const currentShowcase = data[currentDocument];
  const screenshots = currentShowcase?.screenshots || [];
  const currentScreen = screenshots[currentScreenshot];

  const handleNextDocument = () => {
    setIsTransitioning(true);
    setSwipeDirection('left');
    setTimeout(() => {
      setCurrentDocument((prev) => (prev + 1) % data.length);
      setCurrentScreenshot(0);
      setActiveHotspot(null);
      setIsTransitioning(false);
      setSwipeDirection(null);
    }, 300);
  };

  const handlePrevDocument = () => {
    setIsTransitioning(true);
    setSwipeDirection('right');
    setTimeout(() => {
      setCurrentDocument((prev) => (prev - 1 + data.length) % data.length);
      setCurrentScreenshot(0);
      setActiveHotspot(null);
      setIsTransitioning(false);
      setSwipeDirection(null);
    }, 300);
  };

  const handleNext = () => {
    setIsTransitioning(true);
    setSwipeDirection('left');
    setTimeout(() => {
      setCurrentScreenshot((prev) => (prev + 1) % screenshots.length);
      setActiveHotspot(null);
      setIsTransitioning(false);
      setSwipeDirection(null);
    }, 300);
  };

  const handlePrev = () => {
    setIsTransitioning(true);
    setSwipeDirection('right');
    setTimeout(() => {
      setCurrentScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length);
      setActiveHotspot(null);
      setIsTransitioning(false);
      setSwipeDirection(null);
    }, 300);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return LucideIcons.CheckCircle2;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.CheckCircle2;
  };

  // Mouse swipe handlers for document navigation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (data.length <= 1) return;
    setDragStart(e.clientX);
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart === null) return;
    const diff = Math.abs(e.clientX - dragStart);
    if (diff > 5) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStart === null) return;
    const diff = e.clientX - dragStart;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold && isDragging) {
      if (diff > 0) {
        handlePrevDocument();
      } else {
        handleNextDocument();
      }
    }
    setDragStart(null);
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setDragStart(null);
    setIsDragging(false);
  };

  if (!screenshots.length) return null;

  const hotspots = currentScreen?.hotspots || [];
  // Limit to maximum 4 hotspots per screen
  const limitedHotspots = hotspots.slice(0, 4);
  
  return (
    <section className="py-12 app-bg-neutral-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          {currentShowcase.subtitle && (
            <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
              {currentShowcase.subtitle}
            </span>
          )}
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            {currentShowcase.title}
          </h2>
          {currentShowcase.description && (
            <p className="text-lg text-text-subtle max-w-2xl mx-auto">
              {currentShowcase.description}
            </p>
          )}
          
          {/* Document Navigation Dots */}
          {data.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {data.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentDocument(index);
                    setCurrentScreenshot(0);
                    setActiveHotspot(null);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentDocument
                      ? 'w-8 app-bg-primary'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to showcase ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {/* Phone Mockup with Screenshots */}
          <div className="flex justify-center items-center">
            {/* Left Navigation Arrow for Documents */}
            {data.length > 1 && (
              <button
                onClick={handlePrevDocument}
                className="mr-8 hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary hover:text-white shadow-xl hover:shadow-2xl transition-all duration-300 group"
                aria-label="Previous showcase"
              >
                <ChevronLeft className="w-7 h-7 text-gray-700 group-hover:text-white" />
              </button>
            )}

            <div 
              className="relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: data.length > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {/* Phone Frame */}
              <div className="relative w-72 sm:w-80 md:w-96 bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-10"></div>
                
                {/* Screen Container */}
                <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ aspectRatio: '9/19.5' }}>
                  {/* Screenshot Image */}
                  {currentScreen && (
                    <div className={`relative w-full h-full transition-all duration-300 ease-out ${
                      isTransitioning 
                        ? swipeDirection === 'left' 
                          ? 'opacity-0 -translate-x-8' 
                          : 'opacity-0 translate-x-8'
                        : 'opacity-100 translate-x-0'
                    }`}>
                      <img
                        src={urlFor(currentScreen.image).url()}
                        alt={currentShowcase.title}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Hotspots */}
                      {limitedHotspots.map((hotspot, index) => {
                        const Icon = getIcon(hotspot.icon);
                        const isActive = activeHotspot === index;
                        
                        return (
                          <div key={index}>
                            {/* Hotspot Button */}
                            <button
                              onClick={() => setActiveHotspot(isActive ? null : index)}
                              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                                isActive 
                                  ? 'z-50 scale-110' 
                                  : 'z-40 scale-100 hover:scale-110'
                              }`}
                              style={{
                                left: `${hotspot.xPosition}%`,
                                top: `${hotspot.yPosition}%`,
                              }}
                            >
                              {/* Hotspot Icon */}
                              <span className={`relative flex items-center justify-center w-10 h-10 rounded-full app-bg-primary text-white shadow-lg transition-all ${
                                isActive ? 'ring-4 ring-primary/30' : ''
                              }`}>
                                {isActive ? (
                                  <X className="w-5 h-5" />
                                ) : (
                                  <Icon className="w-5 h-5" />
                                )}
                              </span>
                            </button>

                            {/* Hotspot Tooltip */}
                            {isActive && (
                              <div
                                className="absolute z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
                                style={{
                                  left: `${hotspot.xPosition}%`,
                                  top: `${hotspot.yPosition}%`,
                                  transform: 'translate(-50%, calc(-100% - 0.5rem))',
                                }}
                              >
                                <button
                                  onClick={() => setActiveHotspot(null)}
                                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 app-bg-primary-soft rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-text mb-1">
                                      {hotspot.title}
                                    </h4>
                                    <p className="text-sm text-text-subtle">
                                      {hotspot.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Navigation Arrows */}
                  {screenshots.length > 1 && (
                    <>
                      <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
              </div>

              {/* Screenshot Indicators */}
              {screenshots.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {screenshots.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentScreenshot(index);
                        setActiveHotspot(null);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentScreenshot
                          ? 'w-8 app-bg-primary'
                          : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to screenshot ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Navigation Arrow for Documents */}
            {data.length > 1 && (
              <button
                onClick={handleNextDocument}
                className="ml-8 hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary hover:text-white shadow-xl hover:shadow-2xl transition-all duration-300 group"
                aria-label="Next showcase"
              >
                <ChevronRight className="w-7 h-7 text-gray-700 group-hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Document Navigation (visible on small screens) */}
        {data.length > 1 && (
          <div className="md:hidden flex justify-center gap-4 mt-8">
            <button
              onClick={handlePrevDocument}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-sm font-medium text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={handleNextDocument}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-sm font-medium text-gray-700"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
