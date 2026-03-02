import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { TutorialHelper } from "./TutorialHelper";
import { Search, X, Users, Monitor } from "lucide-react";
import { useMapSearch } from "@/contexts/MapSearchContext";
import { useViewMode } from "@/contexts/ViewModeContext";

interface AppLayoutProps {
  children: React.ReactNode;
  fullBleed?: boolean;
  hideFooter?: boolean;
  hideSidebar?: boolean;
}

export const AppLayout = ({
  children,
  fullBleed = false,
  hideFooter = false,
  hideSidebar = false,
}: AppLayoutProps) => {
  const location = useLocation();
  const isMapPage = location.pathname.includes("/maps");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const { setMapSearchQuery, mapSearchSuggestions, onMapSuggestionClick } = useMapSearch();
  const { viewMode, setViewMode } = useViewMode();

  // Reset local query when overlay is closed
  useEffect(() => {
    if (!mobileSearchOpen) {
      setLocalSearchQuery("");
      setMapSearchQuery("");
    }
  }, [mobileSearchOpen, setMapSearchQuery]);

  const handleMobileSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    setMapSearchQuery(value);
  };

  // Check if tutorial should be shown on first visit
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("tutorial_completed");
    const hasVisited = localStorage.getItem("app_first_visit");
    
    if (!tutorialCompleted && !hasVisited) {
      // Small delay to ensure layout is rendered
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      localStorage.setItem("app_first_visit", "true");
      return () => clearTimeout(timer);
    }
  }, []);

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="w-full min-h-screen flex flex-col bg-white overflow-x-hidden">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white border-b flex-shrink-0">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md border hover:bg-gray-50 active:scale-[.97] transition"
        >
          <svg
            className="w-5 h-5"
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
        <span className="font-semibold text-sm text-gray-700">
          RCV Dashboard
        </span>
        {isMapPage && (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="p-2 rounded-md border hover:bg-gray-50 active:scale-[.97] transition"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
        {isMapPage && (
          <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setViewMode("agents")}
            className={`p-2 rounded-md transition ${
              viewMode === "agents"
                ? "bg-teal-100 text-teal-600"
                : "border hover:bg-gray-50"
            }`}
            aria-label="Show inspectors"
            title="Inspectors"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("kiosks")}
            className={`p-2 rounded-md transition ${
              viewMode === "kiosks"
                ? "bg-teal-100 text-teal-600"
                : "border hover:bg-gray-50"
            }`}
            aria-label="Show kiosks"
            title="Kiosks"
          >
            <Monitor className="w-5 h-5" />
          </button>
        </div>
        )}
      </header>

      {/* mobile search overlay - only on maps pages */}
      {isMapPage && mobileSearchOpen && (
        <div className="lg:hidden fixed top-1 left-14 right-0 bg-white z-[9999] border-b flex flex-col" style={{minHeight:'auto'}}>
          <div className="flex items-center gap-2 px-4 py-3 h-14">
            <input
              type="text"
              autoFocus
              value={localSearchQuery}
              onChange={(e) => handleMobileSearchChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              placeholder={viewMode === "agents" ? "Search inspectors..." : "Search kiosk devices..."}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none"
              style={{ pointerEvents: 'auto' }}
            />
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 shrink-0"
              aria-label="Close search"
            >
              {localSearchQuery ? (
                <X className="w-5 h-5" onClick={(e) => { e.stopPropagation(); handleMobileSearchChange(""); }} />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
          {mapSearchSuggestions.length > 0 && (
            <div className="mx-4 mb-2 overflow-y-auto max-h-48 border rounded-md shadow-sm bg-white">
              {mapSearchSuggestions.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMobileSearchChange("");
                    setMobileSearchOpen(false);
                    s && onMapSuggestionClick && onMapSuggestionClick(s as any);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col gap-1 focus:outline-none border-b last:border-b-0 text-sm"
                >
                  <span className="font-medium text-gray-800">{s.name}</span>
                  {s.location && (
                    <p className="text-xs text-gray-500">
                      {s.location.city || s.location.address}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BODY + FOOTER grouped together */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* Sidebar + main content */}
        <div className="flex flex-1 min-w-0 min-h-0">
          {!hideSidebar && (
            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onTutorialStart={() => setShowTutorial(true)}
            />
          )}

          <main className="flex-1 flex flex-col min-h-0 min-w-0">
            <div
              className={
                fullBleed
                  ? "flex-1 min-w-0 min-h-0"
                  : "flex-1 min-w-0 min-h-0 bg-white rounded-none lg:rounded-lg lg:m-0"
              }
            >
              {children}
            </div>
          </main>
        </div>

        {/* Tutorial Helper */}
        {showTutorial && (
          <TutorialHelper onClose={() => setShowTutorial(false)} />
        )}

        {/* Footer sits at the bottom because flex-1 is above it */}
        {!hideFooter && <Footer />}

      </div>
    </div>
  );
};

export default AppLayout;
