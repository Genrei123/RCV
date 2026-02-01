import { useState } from "react";
import type { SanityKioskShowcase } from "@/lib/sanity";
import { Model3DViewer } from "./Model3DViewer";
import * as LucideIcons from "lucide-react";

interface KioskShowcaseProps {
  data: SanityKioskShowcase;
}

export function KioskShowcase({ data }: KioskShowcaseProps) {
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

  if (!data?.model3D) return null;

  const hotspots = data.model3D.hotspots || [];
  const leftHotspots = hotspots.filter((_, index) => index % 2 === 0);
  const rightHotspots = hotspots.filter((_, index) => index % 2 !== 0);

  const getIcon = (iconName?: string) => {
    if (!iconName) return LucideIcons.Package;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Package;
  };

  return (
    <section className="py-20 bg-white">
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
        </div>

        {/* 3-Column Layout: Features | 3D Model | Features */}
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

          {/* 3D Model Viewer */}
          <div className="flex flex-col items-center gap-4">
            {data.model3D.modelFile?.asset?.url && (
              <Model3DViewer
                modelUrl={data.model3D.modelFile.asset.url}
                hotspots={hotspots}
              />
            )}
            {/* Instructions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Drag</span> to rotate • <span className="font-semibold">Scroll</span> to zoom • <span className="font-semibold">Click</span> hotspots to learn more
              </p>
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
          {hotspots && hotspots.length > 0 && (
            <>
              <h4 className="text-sm font-semibold text-text uppercase tracking-wide text-center">
                Kiosk Components
              </h4>
              {hotspots.map((hotspot, index) => {
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
