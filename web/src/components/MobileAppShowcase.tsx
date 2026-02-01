import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { urlFor } from "@/lib/sanity";
import type { SanityMobileAppShowcase } from "@/lib/sanity";
import * as LucideIcons from "lucide-react";

interface MobileAppShowcaseProps {
  data: SanityMobileAppShowcase;
}

export function MobileAppShowcase({ data }: MobileAppShowcaseProps) {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

  const screenshots = data.screenshots || [];
  const currentScreen = screenshots[currentScreenshot];

  const handleNext = () => {
    setCurrentScreenshot((prev) => (prev + 1) % screenshots.length);
    setActiveHotspot(null);
  };

  const handlePrev = () => {
    setCurrentScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length);
    setActiveHotspot(null);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return LucideIcons.CheckCircle2;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.CheckCircle2;
  };

  if (!screenshots.length) return null;

  const hotspots = currentScreen?.hotspots || [];
  // Limit to maximum 4 hotspots per screen
  const limitedHotspots = hotspots.slice(0, 4);
  const leftHotspots = limitedHotspots.filter((_, index) => index % 2 === 0);
  const rightHotspots = limitedHotspots.filter((_, index) => index % 2 !== 0);

  return (
    <section className="py-20 app-bg-neutral-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          {data.subtitle && (
            <span className="inline-block px-4 py-1.5 app-bg-primary text-white rounded-full text-sm font-medium mb-4">
              {data.subtitle}
            </span>
          )}
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            {data.title}
          </h2>
          {data.description && (
            <p className="text-lg text-text-subtle max-w-2xl mx-auto">
              {data.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Left Features */}
          <div className="hidden lg:block space-y-4">
            {leftHotspots.map((hotspot, index) => {
              const actualIndex = index * 2;
              const Icon = getIcon(hotspot.icon);
              const isActive = activeHotspot === actualIndex;
              return (
                <button
                  key={actualIndex}
                  onClick={() => setActiveHotspot(isActive ? null : actualIndex)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isActive
                      ? 'app-border-primary app-bg-primary-soft scale-105'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'app-bg-primary text-white'
                        : 'app-bg-primary-soft text-primary'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-text mb-1">
                        {hotspot.title}
                      </h5>
                      <p className="text-sm text-text-subtle">
                        {hotspot.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Phone Mockup with Screenshots */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Phone Frame */}
              <div className="relative w-72 sm:w-80 md:w-96 bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-10"></div>
                
                {/* Screen Container */}
                <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ aspectRatio: '9/19.5' }}>
                  {/* Screenshot Image */}
                  {currentScreen && (
                    <div className="relative w-full h-full">
                      <img
                        src={urlFor(currentScreen.image).url()}
                        alt={data.title}
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
                              {/* Pulse Animation */}
                              <span className={`absolute inset-0 rounded-full app-bg-primary opacity-75 animate-ping ${
                                isActive ? 'opacity-0' : ''
                              }`}></span>
                              
                              {/* Hotspot Icon */}
                              <span className={`relative flex items-center justify-center w-10 h-10 rounded-full app-bg-primary text-white shadow-lg transition-all ${
                                isActive ? 'ring-4 ring-primary/30' : ''
                              }`}>
                                <Icon className="w-5 h-5" />
                              </span>
                            </button>

                            {/* Hotspot Tooltip */}
                            {isActive && (
                              <div
                                className="absolute z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
                                style={{
                                  left: hotspot.xPosition > 50 ? 'auto' : `${hotspot.xPosition}%`,
                                  right: hotspot.xPosition > 50 ? `${100 - hotspot.xPosition}%` : 'auto',
                                  top: `${hotspot.yPosition}%`,
                                  transform: hotspot.xPosition > 50 
                                    ? 'translate(calc(-100% - 1rem), -50%)' 
                                    : 'translate(1rem, -50%)',
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
          </div>

          {/* Right Features */}
          <div className="hidden lg:block space-y-4">
            {rightHotspots.map((hotspot, index) => {
              const actualIndex = index * 2 + 1;
              const Icon = getIcon(hotspot.icon);
              const isActive = activeHotspot === actualIndex;
              return (
                <button
                  key={actualIndex}
                  onClick={() => setActiveHotspot(isActive ? null : actualIndex)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isActive
                      ? 'app-border-primary app-bg-primary-soft scale-105'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'app-bg-primary text-white'
                        : 'app-bg-primary-soft text-primary'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-text mb-1">
                        {hotspot.title}
                      </h5>
                      <p className="text-sm text-text-subtle">
                        {hotspot.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

                {/* Mobile Features List */}
                <div className="lg:hidden mt-8 space-y-3">
                  {limitedHotspots && limitedHotspots.length > 0 && (
                    <>
                      <h4 className="text-sm font-semibold text-text uppercase tracking-wide text-center">
                        Key Features
                      </h4>
                      {limitedHotspots.map((hotspot, index) => {
                const Icon = getIcon(hotspot.icon);
                const isActive = activeHotspot === index;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveHotspot(isActive ? null : index)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isActive
                        ? 'app-border-primary app-bg-primary-soft'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? 'app-bg-primary text-white'
                          : 'app-bg-primary-soft text-primary'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-text mb-1">
                          {hotspot.title}
                        </h5>
                        <p className="text-sm text-text-subtle">
                          {hotspot.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
                    </>
                  )}
                </div>
      </div>
    </section>
  );
}
