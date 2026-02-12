import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { TutorialHelper } from "./TutorialHelper";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

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
      </header>

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
                  ? "flex-1 min-w-0"
                  : "flex-1 min-w-0 bg-white rounded-none lg:rounded-lg lg:m-0"
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
