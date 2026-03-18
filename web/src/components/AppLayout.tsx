import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { TutorialHelper } from "./TutorialHelper";
import { AuthService } from "@/services/authService";
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

  // Check if tutorial should be shown on first visit (scoped per user)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    AuthService.getCurrentUser().then((user) => {
      if (cancelled || !user?._id) return;

      // Use user-scoped keys so tutorial state follows the user, not the browser
      const userId = user._id;
      const completedKey = `tutorial_completed_${userId}`;
      const visitedKey = `app_first_visit_${userId}`;

      const tutorialCompleted = localStorage.getItem(completedKey);
      const hasVisited = localStorage.getItem(visitedKey);

      if (!tutorialCompleted && !hasVisited) {
        // Small delay to ensure layout is rendered
        timer = setTimeout(() => {
          setShowTutorial(true);
        }, 500);
        localStorage.setItem(visitedKey, "true");
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white border-b shrink-0">
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
          <div className={`${mobileSearchOpen ? 'hidden' : 'ml-auto'} flex items-center gap-2`}>
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
        <div
          className="lg:hidden fixed top-1 left-14 bg-white border-b"
          style={{ zIndex: 99999, pointerEvents: 'auto', touchAction: 'manipulation', right: '56px' }}
        >
          {/* Search input row */}
          <div className="flex items-center gap-2 px-4 py-2 h-14">
            <div className="w-[80%] relative">
              <input
                type="text"
                autoFocus
                value={localSearchQuery}
                onChange={(e) => handleMobileSearchChange(e.target.value)}
                placeholder={viewMode === "agents" ? "Search inspectors..." : "Search kiosk devices..."}
                className="w-full px-3 py-2 border rounded-md focus:outline-none text-sm"
                style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
              />

              {/* Suggestions — positioned absolutely inside the flex-1 container to match rounded input width */}
              {mapSearchSuggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg overflow-y-auto"
                  style={{ maxHeight: '12rem', pointerEvents: 'auto', touchAction: 'manipulation', zIndex: 1 }}
                >
                  {mapSearchSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const suggestion = s;
                        handleMobileSearchChange("");
                        setMobileSearchOpen(false);
                        onMapSuggestionClick(suggestion);
                      }}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 active:bg-gray-100 flex flex-col gap-0.5 border-b last:border-b-0 text-sm"
                      style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
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

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleMobileSearchChange("");
                setMobileSearchOpen(false);
              }}
              className="p-2 shrink-0"
              aria-label="Close search"
              style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
