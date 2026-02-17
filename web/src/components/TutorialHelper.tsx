import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import "../styles/tutorial.css";

interface TutorialStep {
  elementSelector: string;
  title: string;
  description: string;
}

// Sidebar navigation steps (global)
const SIDEBAR_STEPS: TutorialStep[] = [
  {
    elementSelector: '[data-tutorial="dashboard"]',
    title: "Dashboard",
    description: "View your main dashboard with key metrics, recent submissions, and system overview.",
  },
  {
    elementSelector: '[data-tutorial="products"]',
    title: "Products",
    description: "Browse, manage, and analyze all registered products with detailed information.",
  },
  {
    elementSelector: '[data-tutorial="companies"]',
    title: "Companies",
    description: "Manage company profiles, track certifications, and view company details.",
  },
  {
    elementSelector: '[data-tutorial="maps"]',
    title: "Maps",
    description: "Visualize supply chain networks, locations, and geographical data on interactive maps.",
  },
  {
    elementSelector: '[data-tutorial="analytics"]',
    title: "Analytics",
    description: "Access detailed analytics, reports, and insights about compliance and products.",
  },
  {
    elementSelector: '[data-tutorial="mobile-config"]',
    title: "Mobile Config",
    description: "Configure settings and controls for mobile applications and kiosk systems.",
  },
  {
    elementSelector: '[data-tutorial="connect-wallet"]',
    title: "Connect Wallet",
    description: "Connect your MetaMask wallet for blockchain integration and verification.",
  },
];

// Dashboard page specific steps
const DASHBOARD_STEPS: TutorialStep[] = [
  {
    elementSelector: '[data-tutorial="dashboard-stats"]',
    title: "Statistics Overview",
    description: "View total users, products, and companies at a glance. These cards show real-time system metrics.",
  },
  {
    elementSelector: '[data-tutorial="dashboard-tabs"]',
    title: "View Tabs",
    description: "Switch between Users, Invites, Approvals, and My Submissions to manage different aspects of the system.",
  },
  {
    elementSelector: '[data-tutorial="dashboard-table"]',
    title: "Data Table",
    description: "Browse and manage user accounts. Use the search bar and filters to find specific users.",
  },
];

// Products page specific steps
const PRODUCTS_STEPS: TutorialStep[] = [
  {
    elementSelector: '[data-tutorial="products-table"] input[placeholder*="Search"]',
    title: "Search Products",
    description: "Search for products by name, brand, lot number, or company. Results update as you type.",
  },
  {
    elementSelector: '[data-tutorial="products-filter"]',
    title: "Status Filter",
    description: "Toggle between Active and Archived products to filter the list.",
  },
  {
    elementSelector: '[data-tutorial="products-add"]',
    title: "Add Product",
    description: "Click here to register a new product in the system with all its certification details.",
  },
  {
    elementSelector: '[data-tutorial="products-table"]',
    title: "Product List",
    description: "View all registered products with details. Click a row to see full details or download certificates.",
  },
];

// Companies page specific steps
const COMPANIES_STEPS: TutorialStep[] = [
  {
    elementSelector: '[data-tutorial="companies-table"] input[placeholder*="Search"]',
    title: "Search Companies",
    description: "Search for companies by name, address, or license number. Results update as you type.",
  },
  {
    elementSelector: '[data-tutorial="companies-filter"]',
    title: "Status Filter",
    description: "Toggle between Active and Archived companies to filter the list.",
  },
  {
    elementSelector: '[data-tutorial="companies-add"]',
    title: "Add Company",
    description: "Click here to register a new company in the system with license and certification details.",
  },
  {
    elementSelector: '[data-tutorial="companies-table"]',
    title: "Company List",
    description: "View all registered companies with details. Click a row to see full details or download certificates.",
  },
];

// Get steps based on mode and current page
const getStepsForMode = (mode: "sidebar" | "page", pathname: string): TutorialStep[] => {
  if (mode === "sidebar") {
    return SIDEBAR_STEPS;
  }
  // Page-specific tutorials
  if (pathname === "/dashboard" || pathname === "/") {
    return DASHBOARD_STEPS;
  }
  if (pathname === "/products") {
    return PRODUCTS_STEPS;
  }
  if (pathname === "/companies") {
    return COMPANIES_STEPS;
  }
  return SIDEBAR_STEPS;
};

interface TutorialHelperProps {
  onClose?: () => void;
  mode?: "sidebar" | "page";
}

export const TutorialHelper = ({ onClose, mode = "sidebar" }: TutorialHelperProps) => {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightPosition, setHighlightPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get steps based on mode and current location
  const tutorialSteps = getStepsForMode(mode, location.pathname);

  const updateHighlightPosition = () => {
    const step = tutorialSteps[currentStep];
    if (!step) return;
    const element = document.querySelector(step.elementSelector);

    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  useEffect(() => {
    updateHighlightPosition();
    window.addEventListener("resize", updateHighlightPosition);
    window.addEventListener("scroll", updateHighlightPosition);

    return () => {
      window.removeEventListener("resize", updateHighlightPosition);
      window.removeEventListener("scroll", updateHighlightPosition);
    };
  }, [currentStep]);

  // Disable scroll when tutorial is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    }

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [isVisible]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTutorial();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeTutorial = () => {
    setIsVisible(false);
    localStorage.setItem("tutorial_completed", "true");
    onClose?.();
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];

  return (
    <div className="tutorial-container">
      {/* Overlay */}
      <div className="tutorial-overlay" onClick={closeTutorial} />

      {/* Highlight box */}
      {highlightPosition && (
        <>
          <div
            ref={highlightRef}
            className="tutorial-highlight"
            style={{
              top: `${highlightPosition.top}px`,
              left: `${highlightPosition.left}px`,
              width: `${highlightPosition.width}px`,
              height: `${highlightPosition.height}px`,
            }}
          />
          {/* Title label inside highlight */}
          <div
            className="tutorial-highlight-label"
            style={{
              top: `${highlightPosition.top + highlightPosition.height / 2}px`,
              left: `${highlightPosition.left + highlightPosition.width / 2}px`,
            }}
          >
            {step.title}
          </div>
        </>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tutorial-tooltip"
        style={
          highlightPosition
            ? (() => {
                // Responsive tooltip placement: prefer right/left when space allows,
                // otherwise place below or above and always clamp inside viewport.
                const el = highlightPosition;
                const spacing = 12;
                const maxTooltipWidth = Math.min(380, Math.round(window.innerWidth * 0.9));
                const tooltipHeightEstimate = 200; // used for vertical clamping

                const centerX = el.left + el.width / 2;
                const spaceRight = window.innerWidth - (el.left + el.width);
                const spaceLeft = el.left;
                const spaceBelow = window.innerHeight - (el.top + el.height);

                let top = el.top + el.height + spacing; // default: below
                let left = Math.max(12, Math.min(el.left, window.innerWidth - maxTooltipWidth - 12));
                let placement: 'bottom' | 'top' | 'right' | 'left' = 'bottom';

                // Mobile: center tooltip and use viewport width
                if (window.innerWidth <= 640) {
                  const mobileWidth = Math.min(maxTooltipWidth, Math.round(window.innerWidth * 0.85));
                  left = Math.round((window.innerWidth - mobileWidth) / 2);
                  top = Math.min(window.innerHeight - tooltipHeightEstimate - 12, el.top + el.height + 12);
                  placement = 'bottom';
                } else if (spaceRight >= maxTooltipWidth + spacing) {
                  // enough room to the right
                  left = el.left + el.width + spacing;
                  top = Math.min(Math.max(12, el.top + (el.height - tooltipHeightEstimate) / 2), window.innerHeight - tooltipHeightEstimate - 12);
                  placement = 'right';
                } else if (spaceLeft >= maxTooltipWidth + spacing) {
                  // enough room to the left
                  left = Math.max(12, el.left - maxTooltipWidth - spacing);
                  top = Math.min(Math.max(12, el.top + (el.height - tooltipHeightEstimate) / 2), window.innerHeight - tooltipHeightEstimate - 12);
                  placement = 'left';
                } else if (spaceBelow >= tooltipHeightEstimate + spacing) {
                  // place below
                  top = el.top + el.height + spacing;
                  left = Math.max(12, Math.min(el.left, window.innerWidth - maxTooltipWidth - 12));
                  placement = 'bottom';
                } else {
                  // fallback: above
                  top = Math.max(12, el.top - tooltipHeightEstimate - spacing);
                  left = Math.max(12, Math.min(el.left, window.innerWidth - maxTooltipWidth - 12));
                  placement = 'top';
                }

                // compute arrow horizontal offset relative to tooltip
                const arrowLeft = Math.max(12, Math.min(maxTooltipWidth - 24, Math.round(centerX - left - 8)));

                return {
                  top: `${top}px`,
                  left: `${left}px`,
                  width: `${Math.min(maxTooltipWidth, 380)}px`,
                  // expose placement and arrow position to CSS via attributes/variables
                  ['data-placement' as any]: placement,
                  ['--arrow-left' as any]: `${arrowLeft}px`,
                } as React.CSSProperties;
              })()
            : undefined
        }
      >
        <div className="tutorial-tooltip-header">
          <h3 className="tutorial-tooltip-title">{step.title}</h3>
          <button
            onClick={closeTutorial}
            className="tutorial-close-btn"
            aria-label="Close tutorial"
          >
            <X size={20} />
          </button>
        </div>

        <p className="tutorial-tooltip-description">{step.description}</p>

        <div className="tutorial-tooltip-footer">
          <div className="tutorial-progress">
            Step {currentStep + 1} of {tutorialSteps.length}
          </div>

          <div className="tutorial-buttons">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="tutorial-btn tutorial-btn-previous"
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={handleNext}
              className="tutorial-btn tutorial-btn-next"
            >
              {currentStep === tutorialSteps.length - 1 ? "Finish" : "Next"}
              {currentStep < tutorialSteps.length - 1 && (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
