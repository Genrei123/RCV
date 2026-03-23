import { useState, useEffect, useRef } from "react";
import { useMetaMask } from "@/contexts/MetaMaskContext";
import { BarChart3, RefreshCw, Menu, X, Search, Filter, ChevronDown, Check, Maximize2, Minimize2, Download } from "lucide-react";
import { AuthService } from "@/services/authService";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { checkReportIntegrity, type ReportIntegrityCheckResult } from "../services/integrityReportService";
import { toast } from "react-toastify";
import analyticsService from "../services/analyticsService";
import { apiClient } from "../services/axiosConfig";
import type { APIResponse } from "../services/analyticsService";
//import sampleReportsData from "../../reports_sample.json";
import { ScatterplotLayer } from "@deck.gl/layers";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";

declare global {
  interface Window {
    google: any;
  }
}

export function AnalyticsMapComponent() {
  const { isConnected: isWalletConnected, isAuthorized: isWalletAuthorized, connect: connectWallet } = useMetaMask();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clusters' | 'all'>('clusters');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const deckOverlayRef = useRef<any>(null);
  const [show3DHeatmap, setShow3DHeatmap] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDrawerFullscreen, setIsDrawerFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string>("COMPLIANT");
  const [integrityCheckResult, setIntegrityCheckResult] = useState<ReportIntegrityCheckResult | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const hamburgerOriginalParentRef = useRef<HTMLElement | null>(null);
  const drawerOriginalParentRef = useRef<HTMLElement | null>(null);

  const callDBSCANAPI = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.runDBSCANAnalysis({
        // Use a smaller EPS so clusters form locally
        maxDistance: 2,
        minPoints: 3,
      });
      setApiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  
  const handleCheckIntegrity = async (reportId: string) => {
    setIsCheckingIntegrity(true);
    setIntegrityCheckResult(null);
    try {
      const result = await checkReportIntegrity(reportId);
      setIntegrityCheckResult(result);
    } catch (err: any) {
      console.error('Integrity check failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to check integrity. Make sure you are authorized.');
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    setIsResolving(true);
    try {
      // Use the selected resolution status
      const response = await apiClient.post(`/analytics/reports/${reportId}/resolve`, {
        resolution: resolutionStatus,
      });

      // Update the selected report to reflect approval
      if (selectedReport) {
        setSelectedReport({
          ...selectedReport,
          isVerified: true,
          currentStatus: resolutionStatus,
          txHash: response.data.data?.txHash || selectedReport.txHash
        });
      }

      // Show success message inside toast with link if txHash is provided
      toast.success(
        <div>
          <p>{response.data.message || 'Report resolved successfully!'}</p>
          {response.data.data?.etherscanUrl && (
            <a
              href={response.data.data.etherscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 mt-2 text-blue-600 font-semibold"
            >
              Verify on Etherscan
            </a>
          )}
        </div>,
        { autoClose: 5000 }
      );

      // Refresh the analysis to get updated data
      callDBSCANAPI();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to resolve report';
      toast.error(errorMsg);
    } finally {
      setIsResolving(false);
    }
  };

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchUser();
  }, []);

  // Check if user is admin
  const isAdmin = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.role === 'ADMIN';
  };

  // Store original parents for overlays on mount
  useEffect(() => {
    if (hamburgerRef.current?.parentElement && !hamburgerOriginalParentRef.current) {
      hamburgerOriginalParentRef.current = hamburgerRef.current.parentElement;
    }
    if (drawerRef.current?.parentElement && !drawerOriginalParentRef.current) {
      drawerOriginalParentRef.current = drawerRef.current.parentElement;
    }
  }, []);

  // Track fullscreen state and keep overlays inside the fullscreen element
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      const nowFullscreen = !!fullscreenElement;
      setIsFullscreen(nowFullscreen);

      // Ensure we always have original parents stored
      if (hamburgerRef.current?.parentElement && !hamburgerOriginalParentRef.current) {
        hamburgerOriginalParentRef.current = hamburgerRef.current.parentElement;
      }
      if (drawerRef.current?.parentElement && !drawerOriginalParentRef.current) {
        drawerOriginalParentRef.current = drawerRef.current.parentElement;
      }

      // Move elements into or out of the fullscreen element
      setTimeout(() => {
        if (!hamburgerRef.current || !drawerRef.current) return;

        if (nowFullscreen && fullscreenElement) {
          if (hamburgerRef.current.parentElement !== fullscreenElement) {
            fullscreenElement.appendChild(hamburgerRef.current);
          }
          if (drawerRef.current.parentElement !== fullscreenElement) {
            fullscreenElement.appendChild(drawerRef.current);
          }
        } else {
          if (
            hamburgerOriginalParentRef.current &&
            hamburgerRef.current.parentElement !== hamburgerOriginalParentRef.current
          ) {
            hamburgerOriginalParentRef.current.appendChild(hamburgerRef.current);
          }
          if (
            drawerOriginalParentRef.current &&
            drawerRef.current.parentElement !== drawerOriginalParentRef.current
          ) {
            drawerOriginalParentRef.current.appendChild(drawerRef.current);
          }
        }
      }, 0);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as any);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange as any);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange as any);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as any);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange as any);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange as any);
    };
  }, []);

  // When already in fullscreen, ensure overlays stay attached to the fullscreen element
  useEffect(() => {
    if (!isFullscreen) return;

    const fullscreenElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    if (!fullscreenElement) return;

    if (hamburgerRef.current && hamburgerRef.current.parentElement !== fullscreenElement) {
      fullscreenElement.appendChild(hamburgerRef.current);
    }
    if (drawerRef.current && drawerRef.current.parentElement !== fullscreenElement) {
      fullscreenElement.appendChild(drawerRef.current);
    }
  }, [isFullscreen, drawerOpen]);

  // Google Maps initialization
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }
    // If Google Maps is already available, avoid loading script again
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // Prevent duplicate script injection on HMR or remounts
    const existing = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js?key="]`
    );
    if (existing) {
      // Script tag exists but window.google might still be initializing
      existing.addEventListener("load", () => setMapLoaded(true));
      existing.addEventListener("error", () => setMapError(true));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;

    // Default center - Philippines
    const center = { lat: 14.5995, lng: 120.9842 };

    const mapStyles = [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },

      // Hide all POI markers by default (restaurants, bars, etc.)
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
      },
    ];

    // Philippines boundary restrictions
    const philippinesBounds = {
      north: 21.3,
      south: 4.5,
      west: 114.2,
      east: 127.0,
    };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      restriction: {
        latLngBounds: philippinesBounds,
        strictBounds: false,
      },
      gestureHandling: "greedy",
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: mapStyles,
    });

    // Initialize deck.gl overlay - simple version
    deckOverlayRef.current = new GoogleMapsOverlay({
      getTooltip: ({ object }: any) => {
        if (!object) return null;

        return {
          html: object.tooltip,
          style: {
            backgroundColor: "white",
            color: "black",
            fontSize: "12px",
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            border: "1px solid #ccc",
          },
        };
      },
      onClick: async ({ object }: any) => {
        if (object && object.reportId) {
          // Fetch full report details to get current status and complete data
          try {
            const response = await apiClient.get(`/analytics/reports/${object.reportId}`);
            const reportData = response.data.data;
            setSelectedReport({ 
              ...object, 
              ...reportData,
              currentStatus: reportData.status,
              position: object.position // Keep the position from the map object
            });
            setResolutionStatus(reportData.status); // Default to current status
          } catch (err) {
            // Fallback if fetch fails
            console.error('Failed to fetch report details:', err);
            const fallbackStatus = object.status || 'NON_COMPLIANT';
            setSelectedReport({ ...object, currentStatus: fallbackStatus });
            setResolutionStatus(fallbackStatus);
          }
        }
      },
    });
    deckOverlayRef.current.setMap(googleMapRef.current);
    // Ensure deck.gl overlay does not block Google Maps interactions
    try {
      const canvas = (deckOverlayRef.current as any)?._deck?.canvas as
        | HTMLCanvasElement
        | undefined;
      if (canvas) {
        canvas.style.pointerEvents = "none";
      }
    } catch (_) {
      // safely ignore if internals differ
    }
  }, [mapLoaded]);

  // Auto-load DBSCAN analysis when map is ready
  useEffect(() => {
    if (mapLoaded && !apiResponse && !loading) {
      callDBSCANAPI();
    }
  }, [mapLoaded]);

  // Simple visualization effect
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    // Generate simple red variations based on number of clusters
    const generateRedHues = (numClusters: number) => {
      const colors = [];
      for (let i = 0; i < numClusters; i++) {
        const baseRed = 220;
        const green = Math.min(255, i * 40);
        const blue = Math.min(255, i * 20);

        colors.push(`rgb(${baseRed}, ${green}, ${blue})`);
      }
      return colors;
    };

    const clustersLen = apiResponse?.results?.clusters?.length ?? 0;
    const clusterColors = clustersLen > 0 ? generateRedHues(clustersLen) : [];

    // Prepare data for visualization
    const clusterPoints: any[] = [];
    const noisePoints: any[] = [];

    // Helper to coerce value to number or return null
    const toNum = (v: any): number | null => {
      if (typeof v === "number" && !isNaN(v)) return v;
      if (typeof v === "string") {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      }
      return null;
    };

    // Process cluster points with colors
    apiResponse?.results?.clusters?.forEach((cluster, index) => {
      const color = clusterColors[index % clusterColors.length];
      cluster.points?.forEach((point) => {
        const latRaw =
          (point as any).lat ??
          (point as any).latitude ??
          (point as any).coordinates?.[1];
        const lngRaw =
          (point as any).lng ??
          (point as any).longitude ??
          (point as any).long ??
          (point as any).coordinates?.[0];
        const lat = toNum(latRaw);
        const lng = toNum(lngRaw);

        if (lat === null || lng === null) return; // skip invalid points

        const reportId = (point as any)._id ?? (point as any).report?._id ?? null;

        const reporterLabel = (point as any).scannedBy 
          ?? (point as any).report?.agentId 
          ?? ((point as any).report?.kioskId ? `Kiosk: ${(point as any).report.kioskId}` : "");

        clusterPoints.push({
          position: [lng, lat],
          reportId: reportId,
          product:
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report",
          scannedBy: reporterLabel,
          kioskId: (point as any).report?.kioskId ?? null,
          clusterId: cluster.cluster_id,
          color: color,
          tooltip: `<strong>${
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report"
          }</strong><br/>Cluster: ${cluster.cluster_id}<br/>Scanned by: ${
            reporterLabel
          }<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}${
            reportId ? `<br/>Report ID: ${reportId}` : ""
          }`,
        });
      });
    });

    // Process noise points
    if (apiResponse?.results?.noise_points) {
      apiResponse.results.noise_points.forEach((point) => {
        const latRaw =
          (point as any).lat ??
          (point as any).latitude ??
          (point as any).coordinates?.[1];
        const lngRaw =
          (point as any).lng ??
          (point as any).longitude ??
          (point as any).long ??
          (point as any).coordinates?.[0];
        const lat = toNum(latRaw);
        const lng = toNum(lngRaw);
        if (lat === null || lng === null) return;

        const reportId = (point as any)._id ?? (point as any).report?._id ?? null;

        const noiseReporterLabel = (point as any).scannedBy 
          ?? (point as any).report?.agentId 
          ?? ((point as any).report?.kioskId ? `Kiosk: ${(point as any).report.kioskId}` : "");

        noisePoints.push({
          position: [lng, lat],
          reportId: reportId,
          product:
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report",
          scannedBy: noiseReporterLabel,
          kioskId: (point as any).report?.kioskId ?? null,
          tooltip: `<strong>${
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report"
          }</strong><br/>Noise Point<br/>Scanned by: ${
            noiseReporterLabel
          }<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}${
            reportId ? `<br/>Report ID: ${reportId}` : ""
          }`,
        });
      });
    }

    const layers: any[] = [];

    // Optional 3D heatmap (HexagonLayer)
    if (show3DHeatmap) {
      // Build unified positions array from available points
      const positions: [number, number][] = [];
      if (clusterPoints.length > 0) {
        clusterPoints.forEach((p) => positions.push(p.position));
      }
      if (noisePoints.length > 0) {
        noisePoints.forEach((p) => positions.push(p.position));
      }
      // Avoid rendering empty heatmap which can be confusing
      if (positions.length === 0) {
        deckOverlayRef.current?.setProps({ layers: [] });
        return;
      }
      // No demo data; heatmap will render from actual points only

      layers.push(
        new HexagonLayer({
          id: "hex-3d-heatmap",
          data: positions,
          getPosition: (d: [number, number]) => d,
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          radius: 250,
          radiusUnits: "meters",
          extruded: true,
          elevationScale: 200,
          coverage: 1,
          opacity: 0.9,
          lowerPercentile: 5,
          upperPercentile: 98,
          // Warm-to-red ramp for strong heat visuals
          colorRange: [
            [255, 235, 59],
            [255, 193, 7],
            [255, 152, 0],
            [255, 87, 34],
            [244, 67, 54],
            [198, 40, 40],
          ],
          pickable: false,
        })
      );
    }

    // EPS Radius visualization
    if (!show3DHeatmap && clusterPoints.length > 0) {
      // Convert EPS from km to meters for radius calculation
      const epsMeters =
        (apiResponse?.results.clustering_params.eps_km ?? 0) * 1000;

      layers.push(
        new ScatterplotLayer({
          id: "cluster-radius",
          data: clusterPoints,
          getPosition: (d: any) => d.position,
          getRadius: epsMeters, // Use EPS distance as radius
          getFillColor: (d: any) => {
            // Parse RGB color string for radius transparency
            const match = d.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              const r = parseInt(match[1]);
              const g = parseInt(match[2]);
              const b = parseInt(match[3]);
              return [r, g, b, 30]; // Very transparent
            }
            return [255, 0, 0, 30]; // Fallback to red
          },
          stroked: true,
          getLineColor: (d: any) => {
            // Parse RGB color string for border
            const match = d.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              const r = parseInt(match[1]);
              const g = parseInt(match[2]);
              const b = parseInt(match[3]);
              return [r, g, b, 100]; // Semi-transparent border
            }
            return [255, 0, 0, 100]; // Fallback to red
          },
          getLineWidth: 2,
          pickable: false,
          radiusUnits: "meters",
        })
      );
    }

    // Cluster points layer
    if (!show3DHeatmap && clusterPoints.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: "cluster-points",
          data: clusterPoints,
          getPosition: (d: any) => d.position,
          getRadius: 120,
          getFillColor: (d: any) => {
            // Parse RGB color string like "rgb(255, 0, 0)" to [r, g, b, alpha]
            const match = d.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              const r = parseInt(match[1]);
              const g = parseInt(match[2]);
              const b = parseInt(match[3]);
              return [r, g, b, 220];
            }
            // Fallback to red if parsing fails
            return [255, 0, 0, 220];
          },
          pickable: true,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          stroked: true,
          getLineColor: [255, 255, 255, 180],
          getLineWidth: 1,
        })
      );
    }

    // Noise points layer
    if (!show3DHeatmap && noisePoints.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: "noise-points",
          data: noisePoints,
          getPosition: (d: any) => d.position,
          getRadius: 120,
          getFillColor: [107, 114, 128, 220], // Gray for noise
          pickable: true,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          stroked: true,
          getLineColor: [255, 255, 255, 180],
          getLineWidth: 1,
        })
      );
    }

    // Update deck overlay
    if (deckOverlayRef.current) {
      deckOverlayRef.current.setProps({ layers });
    }

    // Fit bounds to show all points
    const allPoints = show3DHeatmap ? [] : [...clusterPoints, ...noisePoints];
    if (allPoints.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      allPoints.forEach((point) => {
        bounds.extend({ lat: point.position[1], lng: point.position[0] });
      });
      googleMapRef.current.fitBounds(bounds);
    }

    // For 3D effect, tilt and set heading when heatmap is active and we have positions
    if (show3DHeatmap) {
      const has3DData = layers.find((l: any) => l.id === "hex-3d-heatmap");
      if (has3DData) {
        try {
          // Increase zoom a bit to make columns visible
          const currentZoom = googleMapRef.current.getZoom?.() ?? 10;
          if (currentZoom < 14) {
            googleMapRef.current.setZoom?.(14);
          }
          // Apply camera tilt and heading if supported
          googleMapRef.current.setTilt?.(60);
          googleMapRef.current.setHeading?.(30);
        } catch (_) {
          // ignore if tilt/heading not supported in this environment
        }
      }
    }
  }, [apiResponse, mapLoaded, show3DHeatmap]);

  // Close status dropdown when clicking outside and handle positioning
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setShowStatusDropdown(false);
      }
    };

    const calculatePosition = () => {
      if (triggerButtonRef.current && showStatusDropdown) {
        const rect = triggerButtonRef.current.getBoundingClientRect();
        const dropdownHeight = 160; // Approximate height of dropdown
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        
        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
          setDropdownPosition('above');
        } else {
          setDropdownPosition('below');
        }
      }
    };

    if (showStatusDropdown) {
      document.addEventListener("click", handleClickOutside);
      calculatePosition();
      window.addEventListener("resize", calculatePosition);
      window.addEventListener("scroll", calculatePosition);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition);
    };
  }, [showStatusDropdown]);


  const renderFullscreenDashboard = () => {
    // Filter reports for the dashboard grid
    let allFilteredReports = 0;
    const filteredClusters = apiResponse?.results?.clusters?.map(cluster => {
      const filteredPts = cluster.points?.filter((report: any) => {
        const reportId = report._id ?? report.report?._id;
        const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
        const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
        const matchesSearch = searchQuery === "" || 
          productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reportId?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || reportStatus === statusFilter;
        return matchesSearch && matchesStatus;
      }) ?? [];
      allFilteredReports += filteredPts.length;
      return { ...cluster, filteredPoints: filteredPts };
    }) ?? [];

    const filteredNoise = apiResponse?.results?.noise_points?.filter((report: any) => {
      const reportId = report._id ?? report.report?._id;
      const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
      const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
      const matchesSearch = searchQuery === "" || 
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reportId?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || reportStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }) ?? [];

    return (
      <div className="p-4 sm:p-6 bg-slate-50 h-full overflow-y-auto flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Bar: Search, Filters, Execute */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search products or IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 text-sm bg-slate-50 border-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 relative z-50">
                <Filter className="h-5 w-5 text-slate-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] h-11 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All Reports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Reports</SelectItem>
                    <SelectItem value="COMPLIANT">Compliant</SelectItem>
                    <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                    <SelectItem value="FRAUDULENT">Fraudulent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={show3DHeatmap}
                  onChange={(e) => setShow3DHeatmap(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                3D Heatmap
              </label>
              <Button
                onClick={callDBSCANAPI}
                disabled={loading}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing</>
                ) : (
                  <><RefreshCw className="mr-2 h-5 w-5" /> Run Analytics</>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Stats Grid */}
          {apiResponse?.results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full translate-x-8 -translate-y-8"></div>
                <p className="text-sm text-slate-500 font-medium mb-1 relative z-10">Total Reports</p>
                <p className="text-3xl font-bold text-slate-800 relative z-10">{apiResponse.results.summary?.total_points ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 rounded-full translate-x-8 -translate-y-8"></div>
                <p className="text-sm text-slate-500 font-medium mb-1 relative z-10">Clusters</p>
                <p className="text-3xl font-bold text-teal-600 relative z-10">{apiResponse.results.summary?.n_clusters ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-full translate-x-8 -translate-y-8"></div>
                <p className="text-sm text-slate-500 font-medium mb-1 relative z-10">Noise Points</p>
                <p className="text-3xl font-bold text-orange-600 relative z-10">{apiResponse.results.summary?.n_noise_points ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-full translate-x-8 -translate-y-8"></div>
                <p className="text-sm text-slate-500 font-medium mb-1 relative z-10">Noise Percentage</p>
                <p className="text-3xl font-bold text-red-600 relative z-10">{(apiResponse.results.summary?.noise_percentage ?? 0).toFixed(1)}%</p>
              </div>
            </div>
          )}

          {/* Main Dashboard Area */}
          {apiResponse?.results && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-10">
              
              {/* Left Column: Data Clusters (Reports) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="flex flex-col border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-6 px-5 pt-4">
                      <button 
                        onClick={() => setActiveTab('clusters')}
                        className={`font-semibold text-sm pb-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'clusters' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                        Detailed Cluster Analysis ({allFilteredReports} Reports)
                      </button>
                      <button 
                        onClick={() => setActiveTab('all')}
                        className={`font-semibold text-sm pb-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'all' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                        All Reports
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-6">
                    {activeTab === 'clusters' && (
                      <>
                        {filteredClusters.length === 0 && filteredNoise.length === 0 && (
                           <div className="text-center py-10 text-slate-500">
                             <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                             <p>No reports match your current filters.</p>
                           </div>
                        )}
                        
                        {filteredClusters.map(cluster => {
                          if (cluster.filteredPoints.length === 0) return null;
                          const baseRed = 220;
                          const green = Math.min(255, cluster.cluster_id * 40);
                          const blue = Math.min(255, cluster.cluster_id * 20);
                          const color = `rgb(${baseRed}, ${green}, ${blue})`;
                          
                          return (
                            <div key={cluster.cluster_id} className="border border-slate-100 rounded-xl overflow-hidden">
                              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                                <h4 className="font-medium text-slate-800">Cluster {cluster.cluster_id}</h4>
                                <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">
                                  {cluster.filteredPoints.length} Items
                                </span>
                              </div>
                              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                                {cluster.filteredPoints.map((report: any, idx: number) => {
                                  const reportId = report._id ?? report.report?._id;
                                  const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                                  const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                                  const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                                  const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                                  
                                  return (
                                    <button
                                      key={reportId || idx}
                                      onClick={() => {
                                        if (reportId) {
                                          if (lat && lng && googleMapRef.current) {
                                            googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                            googleMapRef.current.setZoom(18);
                                          }
                                          apiClient.get(`/analytics/reports/${reportId}`).then(res => {
                                              const reportData = res.data.data;
                                              setSelectedReport({ ...report, ...reportData, reportId, currentStatus: reportData.status, position: [lng, lat] });
                                              setResolutionStatus(reportData.status);
                                          }).catch(err => console.error(err));
                                        }
                                      }}
                                      className="text-left p-3 rounded-lg hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all shadow-sm group bg-white"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-semibold text-slate-800 truncate mb-1 group-hover:text-blue-700">
                                            {productName}
                                          </div>
                                          <div className="text-xs text-slate-500 font-mono truncate">
                                            ID: {reportId ? reportId.slice(0, 12) + '...' : 'Unknown'} {(report as any).createdAt || (report as any).report?.createdAt ? `[${new Date((report as any).createdAt || (report as any).report?.createdAt).toLocaleDateString()}]` : ''}
                                          </div>
                                        </div>
                                        <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-md ${
                                          reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700 border border-green-200' :
                                          reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700 border border-red-200' :
                                          'bg-amber-100 text-amber-700 border border-amber-200'
                                        }`}>
                                          {reportStatus === 'COMPLIANT' ? 'COMPLIANT' :
                                           reportStatus === 'FRAUDULENT' ? 'FRAUDULENT' : 'NON-COMPLIANT'}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {filteredNoise.length > 0 && (
                          <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full shadow-sm bg-slate-500"></div>
                              <h4 className="font-medium text-slate-800">Noise Points</h4>
                              <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">
                                {filteredNoise.length} Items
                              </span>
                            </div>
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                              {filteredNoise.map((report: any, idx: number) => {
                                const reportId = report._id ?? report.report?._id;
                                const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                                const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                                const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                                const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                                
                                return (
                                  <button
                                    key={reportId || idx}
                                    onClick={() => {
                                      if (reportId) {
                                        if (lat && lng && googleMapRef.current) {
                                          googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                          googleMapRef.current.setZoom(15);
                                        }
                                        apiClient.get(`/analytics/reports/${reportId}`).then(res => {
                                            const reportData = res.data.data;
                                            setSelectedReport({ ...report, ...reportData, reportId, currentStatus: reportData.status, position: [lng, lat] });
                                            setResolutionStatus(reportData.status);
                                        }).catch(err => console.error(err));
                                      }
                                    }}
                                    className="text-left p-3 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all shadow-sm group bg-white"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-800 truncate mb-1 group-hover:text-amber-700">
                                          {productName}
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono truncate">
                                          ID: {reportId ? reportId.slice(0, 12) + '...' : 'Unknown'} {(report as any).createdAt || (report as any).report?.createdAt ? `[${new Date((report as any).createdAt || (report as any).report?.createdAt).toLocaleDateString()}]` : ''}
                                        </div>
                                      </div>
                                      <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-md ${
                                        reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700 border border-green-200' :
                                        reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700 border border-red-200' :
                                        'bg-amber-100 text-amber-700 border border-amber-200'
                                      }`}>
                                        {reportStatus === 'COMPLIANT' ? 'COMPLIANT' :
                                         reportStatus === 'FRAUDULENT' ? 'FRAUDULENT' : 'NON-COMPLIANT'}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'all' && (
                      <div className="space-y-4">
                        {(apiResponse?.results?.clusters?.flatMap(c => c.points) || []).sort((a: any, b: any) => new Date(b.createdAt || b.report?.createdAt || b.scannedAt || b.report?.scannedAt || 0).getTime() - new Date(a.createdAt || a.report?.createdAt || a.scannedAt || a.report?.scannedAt || 0).getTime()).map((report: any, idx: number) => {
                          const reportId = report._id ?? report.report?._id;
                          const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                          const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                          const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                          const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                          const createdAt = report.createdAt ?? report.report?.createdAt;
                          
                          return (
                            <button
                              key={reportId || idx}
                              onClick={() => {
                                if (reportId) {
                                  if (lat && lng && googleMapRef.current) {
                                    googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                    googleMapRef.current.setZoom(15);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }
                                  apiClient.get(`/analytics/reports/${reportId}`).then(res => {
                                      const reportData = res.data.data;
                                      setSelectedReport({ ...report, ...reportData, reportId, currentStatus: reportData.status, position: [lng, lat] });
                                      setResolutionStatus(reportData.status);
                                  }).catch(err => console.error(err));
                                }
                              }}
                              className="w-full text-left p-4 rounded-xl hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all shadow-sm group bg-white flex flex-col gap-2"
                            >
                              <div className="flex items-start justify-between gap-3 w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-semibold text-slate-800 truncate mb-1 group-hover:text-indigo-700">
                                    {productName}
                                  </div>
                                  <div className="text-sm text-slate-500 font-mono truncate">
                                    ID: {reportId ? reportId.slice(0, 12) + '...' : 'Unknown'}
                                  </div>
                                </div>
                                <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-md ${
                                  reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700 border border-red-200' :
                                  'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                  {reportStatus === 'COMPLIANT' ? 'COMPLIANT' :
                                   reportStatus === 'FRAUDULENT' ? 'FRAUDULENT' : 'NON-COMPLIANT'}
                                </span>
                              </div>
                              {createdAt && (
                                <div className="text-xs text-slate-400 mt-1">
                                  {new Date(createdAt).toLocaleString()}
                                </div>
                              )}
                            </button>
                          );
                        })}
                        {((apiResponse?.results?.clusters?.flatMap(c => c.points) || []).length === 0) && (
                          <div className="text-center py-10 text-slate-500">
                            <p>No reports found.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Parameters and Visualization Map */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                      DBSCAN Configuration
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">EPS Distance:</span>
                      <span className="font-medium text-slate-800">{apiResponse.results.clustering_params?.eps_km ?? 0} km</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Min Samples:</span>
                      <span className="font-medium text-slate-800">{apiResponse.results.clustering_params?.min_samples ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Processing Time:</span>
                      <span className="font-medium text-slate-800 text-right">
                        {apiResponse.metadata?.processing_time ? new Date(apiResponse.metadata.processing_time).toLocaleString() : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                      Cluster Map Legend
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    {apiResponse.results.clusters?.map((cluster, index) => {
                      const baseRed = 220;
                      const green = Math.min(255, index * 40);
                      const blue = Math.min(255, index * 20);
                      const color = `rgb(${baseRed}, ${green}, ${blue})`;
                      return (
                        <div key={cluster.cluster_id} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                          <span className="text-slate-700">Cluster {cluster.cluster_id} <span className="text-slate-400">({cluster.size} pts)</span></span>
                        </div>
                      );
                    })}
                    {(apiResponse.results.summary?.n_noise_points ?? 0) > 0 && (
                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100 mt-2">
                        <div className="w-4 h-4 rounded-full shadow-sm bg-slate-500"></div>
                        <span className="text-slate-700">Noise Points <span className="text-slate-400">({apiResponse.results.summary?.n_noise_points} pts)</span></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Card className="p-8">
          <p className="text-red-600">
            Map unavailable. Check Google Maps API configuration.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Google Map */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Hamburger Button */}
      <div
        ref={hamburgerRef}
        className="absolute top-15 right-2 z-20 pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        <Button
          variant="outline"
          className="rounded-full shadow-md"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-4 w-10" />
        </Button>
      </div>

      {/* Right-side Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-[56px] lg:top-0 right-0 h-[calc(100vh-56px)] lg:h-full z-50 transform transition-all duration-300 bg-white shadow-xl ${
          isDrawerFullscreen ? "w-full" : "w-full sm:w-[450px]"
        } ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ pointerEvents: "auto" }}
      >
        <div className="h-full w-full bg-white border-l-0 sm:border-l border-gray-200 shadow-xl sm:shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-2 sm:p-3 border-b gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BarChart3 className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">DBSCAN Analytics</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawerFullscreen(!isDrawerFullscreen)}
                className="flex-shrink-0"
                title={isDrawerFullscreen ? "Minimize" : "Maximize"}
              >
                {isDrawerFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDrawerOpen(false);
                  setIsDrawerFullscreen(false); // Reset on close
                }}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isDrawerFullscreen ? renderFullscreenDashboard() : (
            <div className="p-2 sm:p-3 space-y-3 overflow-y-auto h-full flex-1">
            {/* Statistics Card - Now prominently at the top */}
            {apiResponse?.results && (
              <Card className="shadow-md p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <span className="text-base font-bold break-words">
                    Clustering Results
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {apiResponse?.results?.summary?.total_points ?? 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Clusters Found</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {apiResponse?.results?.summary?.n_clusters ?? 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Noise Points</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {apiResponse?.results?.summary?.n_noise_points ?? 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Noise %</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(apiResponse?.results?.summary?.noise_percentage ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
              <div className="text-left">
                <p className="text-xs text-gray-600 mb-2">
                </p>
                <Button
                  onClick={callDBSCANAPI}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Run Analysis
                    </>
                  )}
                </Button>
                <div className="mt-3 text-left">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={show3DHeatmap}
                      onChange={(e) => setShow3DHeatmap(e.target.checked)}
                    />
                    Enable 3D Heatmap
                  </label>
                </div>
              </div>
            </Card>

            {error && (
              <Card className="p-2 sm:p-3 border-red-200 bg-red-50">
                <div className="text-red-600">
                  <h3 className="font-semibold mb-1 text-sm">Error</h3>
                  <p className="text-xs break-words">{error}</p>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold mb-2 flex items-center gap-2 min-w-0">
                    <span className="break-words">DBSCAN Parameters</span>
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className="break-words">
                      <span className="font-medium">EPS:</span>{" "}
                      {apiResponse?.results?.clustering_params?.eps_km ?? 0} km
                    </p>
                    <p className="break-words">
                      <span className="font-medium">Min Samples:</span>{" "}
                      {apiResponse?.results?.clustering_params?.min_samples ??
                        0}
                    </p>
                    <p className="break-words">
                      <span className="font-medium">Processing Time:</span>{" "}
                      {apiResponse?.metadata?.processing_time
                        ? new Date(
                            apiResponse.metadata.processing_time
                          ).toLocaleTimeString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="text-sm">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <span className="break-words">Cluster Visualization</span>
                  </p>
                  <div className="space-y-2 text-xs">
                    {apiResponse?.results?.clusters?.map((cluster, index) => {
                      const baseRed = 220;
                      const green = Math.min(255, index * 40);
                      const blue = Math.min(255, index * 20);
                      const color = `rgb(${baseRed}, ${green}, ${blue})`;
                      return (
                        <div
                          key={cluster.cluster_id}
                          className="flex items-center gap-2 min-w-0"
                        >
                          <div
                            className="w-3 h-3 rounded-full border border-white flex-shrink-0"
                            style={{ backgroundColor: color }}
                          ></div>
                          <span className="break-words">
                            Cluster {cluster.cluster_id} ({cluster.size}{" "}
                            reports)
                          </span>
                        </div>
                      );
                    })}
                    {(apiResponse?.results?.summary?.n_noise_points ?? 0) >
                      0 && (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full border border-white bg-gray-500 flex-shrink-0"></div>
                        <span className="break-words">
                          Noise Points (
                          {apiResponse?.results?.summary?.n_noise_points})
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t text-xs text-gray-500">
                      <p className="break-words">
                        Total:{" "}
                        {apiResponse?.results?.summary?.total_points ?? 0}{" "}
                        reports
                      </p>
                      <p className="break-words">
                        EPS Radius:{" "}
                        {apiResponse?.results?.clustering_params?.eps_km ?? 0}{" "}
                        km
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <span className="text-sm font-semibold break-words">
                    Clustering Results
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Total Points:</span>
                    <span className="font-medium flex-shrink-0">
                      {apiResponse?.results?.summary?.total_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Clusters:</span>
                    <span className="font-medium text-blue-600 flex-shrink-0">
                      {apiResponse?.results?.summary?.n_clusters ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Noise Points:</span>
                    <span className="font-medium text-gray-600 flex-shrink-0">
                      {apiResponse?.results?.summary?.n_noise_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Noise %:</span>
                    <span className="font-medium text-orange-600 flex-shrink-0">
                      {(
                        apiResponse?.results?.summary?.noise_percentage ?? 0
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Reports List Section */}
            {apiResponse?.results && (
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <span className="text-sm font-semibold break-words">
                    Reports List
                  </span>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by product name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 relative" ref={statusDropdownRef}>
                    <Filter className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                    <button
                      ref={triggerButtonRef}
                      type="button"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="h-8 px-3 text-xs border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2 rounded-md min-w-[120px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="truncate text-left">
                        {statusFilter === "ALL" ? "All Reports" :
                         statusFilter === "COMPLIANT" ? "Compliant" :
                         statusFilter === "NON_COMPLIANT" ? "Non-Compliant" :
                         statusFilter === "FRAUDULENT" ? "Fraudulent" : "All Reports"}
                      </span>
                      <ChevronDown 
                        className={`h-4 w-4 opacity-50 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    
                    {showStatusDropdown && (
                      <div 
                        className={`absolute left-5 w-[120px] bg-popover border border-border rounded-md shadow-md overflow-hidden z-50 ${
                          dropdownPosition === 'above' 
                            ? 'bottom-full mb-1' 
                            : 'top-full mt-1'
                        }`}
                        style={{ minWidth: triggerButtonRef.current?.offsetWidth || 120 }}
                      >
                        <div className="p-1">
                          {[
                            { value: "ALL", label: "All Reports" },
                            { value: "COMPLIANT", label: "Compliant" },
                            { value: "NON_COMPLIANT", label: "Non-Compliant" },
                            { value: "FRAUDULENT", label: "Fraudulent" }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setStatusFilter(option.value);
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full px-2 py-1.5 text-left text-xs rounded-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:bg-accent focus:text-accent-foreground flex items-center justify-between ${
                                statusFilter === option.value ? 'bg-accent text-accent-foreground' : ''
                              }`}
                            >
                              <span>{option.label}</span>
                              {statusFilter === option.value && (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const getReportTimeMs = (report: any): number => {
                      const raw =
                        report?.createdAt ??
                        report?.scannedAt ??
                        report?.report?.createdAt ??
                        report?.report?.scannedAt;
                      if (!raw) return 0;
                      const ms = Date.parse(String(raw));
                      return Number.isFinite(ms) ? ms : 0;
                    };

                    // Calculate total filtered reports across all clusters
                    const allFilteredReports = apiResponse?.results?.clusters?.reduce((total, cluster) => {
                      const filteredReports = cluster.points?.filter((report: any) => {
                        const reportId = report._id ?? report.report?._id;
                        const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                        const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                        
                        // Search filter
                        const matchesSearch = searchQuery === "" || 
                          productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          reportId?.toLowerCase().includes(searchQuery.toLowerCase());
                        
                        // Status filter
                        const matchesStatus = statusFilter === "ALL" || reportStatus === statusFilter;
                        
                        return matchesSearch && matchesStatus;
                      }) ?? [];
                      
                      return total + filteredReports.length;
                    }, 0) ?? 0;

                    // Show empty state if no reports match filters
                    if (allFilteredReports === 0) {
                      return (
                        <Card className="p-4 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <Search className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">No reports found</p>
                              <p className="text-xs">
                                {searchQuery || statusFilter !== "ALL" 
                                  ? "Try adjusting your search or filters"
                                  : "No reports available"
                                }
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    }

                    // Show filtered clusters
                    const preparedClusters = (apiResponse?.results?.clusters ?? [])
                      .map((cluster) => {
                        const filteredReports =
                          cluster.points?.filter((report: any) => {
                            const reportId = report._id ?? report.report?._id;
                            const productName =
                              report.product ??
                              report.report?.scannedData?.productName ??
                              "Unknown Product";
                            const reportStatus =
                              report.status ?? report.report?.status ?? "NON_COMPLIANT";

                            const matchesSearch =
                              searchQuery === "" ||
                              productName
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              reportId
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase());

                            const matchesStatus =
                              statusFilter === "ALL" || reportStatus === statusFilter;

                            return matchesSearch && matchesStatus;
                          }) ?? [];

                        const sortedReports = [...filteredReports].sort(
                          (a: any, b: any) => getReportTimeMs(b) - getReportTimeMs(a)
                        );
                        const latestTimeMs =
                          sortedReports.length > 0 ? getReportTimeMs(sortedReports[0]) : 0;
                        return { cluster, sortedReports, latestTimeMs };
                      })
                      .filter((x) => x.sortedReports.length > 0)
                      .sort((a, b) => b.latestTimeMs - a.latestTimeMs);

                    return preparedClusters.map(({ cluster, sortedReports }) => (
                      <div key={cluster.cluster_id} className="space-y-1">
                        <div className="text-xs font-medium text-gray-700 sticky top-0 bg-white py-1">
                          Cluster {cluster.cluster_id} ({sortedReports.length} reports)
                        </div>
                        {sortedReports.map((report: any, idx: number) => {
                        const reportId = report._id ?? report.report?._id;
                        const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                        const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                        const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                        const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                        
                        return (
                          <button
                            key={reportId || idx}
                            onClick={() => {
                              if (reportId && googleMapRef.current) {
                                // Pan to report location on map
                                if (lat && lng) {
                                  googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                  googleMapRef.current.setZoom(15);
                                }
                                // Fetch and show report details
                                apiClient.get(`/analytics/reports/${reportId}`)
                                  .then(response => {
                                    const reportData = response.data.data;
                                    setSelectedReport({ 
                                      ...report, 
                                      ...reportData,
                                      reportId, 
                                      currentStatus: reportData.status,
                                      position: [lng, lat]
                                    });
                                    setResolutionStatus(reportData.status);
                                  })
                                  .catch(err => {
                                    console.error('Failed to fetch report:', err);
                                  });
                              }
                            }}
                            className="w-full text-left p-2 rounded hover:bg-gray-50 border border-gray-200 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-800 truncate">
                                  {productName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {reportId ? `ID: ${reportId.slice(0, 8)}...` : 'No ID'}
                                </div>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                                reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                                reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {reportStatus === 'COMPLIANT' ? 'OK' :
                                 reportStatus === 'FRAUDULENT' ? 'FRD' : 'NC'}
                              </span>
                            </div>
                          </button>
                        );
                        })}
                      </div>
                    ));
                })()}

                  {/* Noise Points Section */}
                  {(() => {
                    const filteredNoisePoints = apiResponse?.results?.noise_points?.filter((report: any) => {
                      const reportId = report._id ?? report.report?._id;
                      const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                      const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                      
                      const matchesSearch = searchQuery === "" || 
                        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        reportId?.toLowerCase().includes(searchQuery.toLowerCase());
                      
                      const matchesStatus = statusFilter === "ALL" || reportStatus === statusFilter;
                      
                      return matchesSearch && matchesStatus;
                    }) ?? [];

                    if (filteredNoisePoints.length === 0) return null;

                    return (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="text-xs font-medium text-gray-700 sticky top-0 bg-white py-1">
                        Noise Points ({filteredNoisePoints.length})
                      </div>
                      {filteredNoisePoints.slice(0, 10).map((report: any, idx: number) => {
                        const reportId = report._id ?? report.report?._id;
                        const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                        const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                        const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                        const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                        
                        return (
                          <button
                            key={reportId || idx}
                            onClick={() => {
                              if (reportId && googleMapRef.current) {
                                if (lat && lng) {
                                  googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                  googleMapRef.current.setZoom(15);
                                }
                                apiClient.get(`/analytics/reports/${reportId}`)
                                  .then(response => {
                                    const reportData = response.data.data;
                                    setSelectedReport({ 
                                      ...report, 
                                      ...reportData,
                                      reportId, 
                                      currentStatus: reportData.status,
                                      position: [lng, lat]
                                    });
                                    setResolutionStatus(reportData.status);
                                  })
                                  .catch(err => {
                                    console.error('Failed to fetch report:', err);
                                  });
                              }
                            }}
                            className="w-full text-left p-2 rounded hover:bg-gray-50 border border-gray-200 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-800 truncate">
                                  {productName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {reportId ? `ID: ${reportId.slice(0, 8)}...` : 'No ID'}
                                </div>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                                reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                                reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {reportStatus === 'COMPLIANT' ? 'OK' :
                                 reportStatus === 'FRAUDULENT' ? 'FRD' : 'NC'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {filteredNoisePoints.length > 10 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          Showing 10 of {filteredNoisePoints.length} noise points
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </div>
              </Card>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => { setSelectedReport(null); setIntegrityCheckResult(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between mt-4 mb-4">
            <DialogTitle>
              {selectedReport?.product || "Compliance Report"}
            </DialogTitle>
            {selectedReport && selectedReport.isVerified && (
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${
                  integrityCheckResult?.status === "intact"
                    ? "border-green-500 text-green-700 bg-green-50"
                    : integrityCheckResult?.status === "tampered"
                    ? "border-red-500 text-red-700 bg-red-50"
                    : integrityCheckResult?.status === "no_blockchain"
                    ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                    : ""
                }`}
                onClick={() => handleCheckIntegrity(selectedReport._id || selectedReport.reportId)}
                disabled={isCheckingIntegrity}
              >
                {isCheckingIntegrity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null }
                {isCheckingIntegrity
                  ? "Checking..."
                  : integrityCheckResult?.status === "intact"
                  ? "Data Intact"
                  : integrityCheckResult?.status === "tampered"
                  ? "Data Tampered"
                  : "Check Integrity"}
              </Button>
            )}
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              
              {/* Integrity Check Result */}
              {integrityCheckResult && (
                <div className={`p-4 rounded-lg border ${
                  integrityCheckResult.status === 'intact' ? 'bg-green-50 border-green-200' :
                  integrityCheckResult.status === 'tampered' ? 'bg-red-50 border-red-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    Integrity Status: {integrityCheckResult.status.toUpperCase()}
                  </h4>
                  <p className="text-sm mb-3">{integrityCheckResult.message}</p>
                  
                  {integrityCheckResult.fields.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-white bg-opacity-50">
                          <tr>
                            <th className="p-2 font-medium">Field</th>
                            <th className="p-2 font-medium">Current Database</th>
                            <th className="p-2 font-medium">Blockchain Found</th>
                            <th className="p-2 font-medium text-center">Match</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white bg-opacity-40">
                          {integrityCheckResult.fields.map((field) => (
                            <tr key={field.field} className={!field.match ? 'text-red-700 font-medium' : ''}>
                              <td className="p-2 truncate max-w-[100px]" title={field.label}>{field.label}</td>
                              <td className="p-2 break-words max-w-[150px]">{field.dbValue}</td>
                              <td className="p-2 break-words max-w-[150px]">{field.blockchainValue}</td>
                              <td className="p-2 text-center">
                                {field.match ? "Yes" : "No"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {integrityCheckResult.etherscanUrl && (
                    <a
                      href={integrityCheckResult.etherscanUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block flex items-center"
                    >
                      View Transaction on Etherscan
                    </a>
                  )}
                </div>
              )}

              {/* Report Images */}
              {(selectedReport.frontImageUrl || selectedReport.backImageUrl || (selectedReport.additionalImageUrls && selectedReport.additionalImageUrls.length > 0)) && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-2">
                    Product Images
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.frontImageUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Front</p>
                        <img 
                          src={selectedReport.frontImageUrl} 
                          alt="Front" 
                          className="w-full h-32 object-cover rounded border"
                          onClick={() => window.open(selectedReport.frontImageUrl, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )}
                    {selectedReport.backImageUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Back</p>
                        <img 
                          src={selectedReport.backImageUrl} 
                          alt="Back" 
                          className="w-full h-32 object-cover rounded border"
                          onClick={() => window.open(selectedReport.backImageUrl, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )}
                  </div>
                  {/* Additional Images */}
                  {selectedReport.additionalImageUrls && selectedReport.additionalImageUrls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Additional Views ({selectedReport.additionalImageUrls.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {selectedReport.additionalImageUrls.map((url: string, index: number) => {
                          const sideNames = selectedReport.additionalImageUrls.length === 2 
                            ? ['Left', 'Right'] 
                            : ['Top', 'Bottom', 'Left', 'Right'];
                          const sideName = index < sideNames.length ? sideNames[index] : `Side ${index + 1}`;
                          return (
                            <div key={index}>
                              <p className="text-xs text-gray-500 mb-1">{sideName}</p>
                              <img 
                                src={url} 
                                alt={sideName} 
                                className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => window.open(url, '_blank')}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Report ID */}
              {selectedReport.reportId && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Report ID
                  </p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {selectedReport.reportId}
                  </p>
                </div>
              )}

              {/* Blockchain Transaction */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">Blockchain Transaction</p>
                {selectedReport.txHash ? (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${selectedReport.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono break-all flex items-center gap-1"
                  >
                    {selectedReport.txHash}
                  </a>
                ) : (
                  <p className="text-sm text-neutral-500 italic">
                    No blockchain transaction found.
                  </p>
                )}
              </div>


              {/* Reporter Info */}
              {(selectedReport.agent || selectedReport.agentId || selectedReport.kioskId) && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Reported By
                  </p>
                  {selectedReport.kioskId && !selectedReport.agentId ? (
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                          KIOSK
                        </span>
                        <p className="text-base font-semibold text-emerald-900">
                          {selectedReport.scannedData?.kioskName || selectedReport.kioskId}
                        </p>
                      </div>
                      <p className="text-xs text-emerald-600 font-mono">
                        Kiosk ID: {selectedReport.kioskId}
                      </p>
                      {selectedReport.location?.address && (
                        <p className="text-xs text-emerald-700 mt-1">
                          {selectedReport.location.address}
                        </p>
                      )}
                    </div>
                  ) : (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {selectedReport.agent ? (
                      <>
                        <p className="text-base font-semibold text-blue-900 mb-1">
                          {selectedReport.agent.firstName && selectedReport.agent.lastName
                            ? `${selectedReport.agent.firstName} ${selectedReport.agent.lastName}`
                            : selectedReport.agent.email}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedReport.agent.email}
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-mono">
                          ID: {selectedReport.agentId}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-mono text-blue-900">
                        Agent ID: {selectedReport.agentId}
                      </p>
                    )}
                  </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              {selectedReport.createdAt && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Report Time
                  </p>
                  <p className="text-sm text-neutral-900">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Product Name */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Product
                </p>
                <p className="text-base text-neutral-900">
                  {selectedReport.product || selectedReport.scannedData?.productName || "N/A"}
                </p>
              </div>

              {/* Cluster Info */}
              {selectedReport.clusterId !== undefined && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Cluster
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedReport.color && (
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: selectedReport.color }}
                      />
                    )}
                    <p className="text-base text-neutral-900">
                      {selectedReport.clusterId === -1
                        ? "Noise Point"
                        : `Cluster ${selectedReport.clusterId}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Location
                </p>
                {selectedReport.location?.address && (
                  <p className="text-sm text-neutral-900 mb-1">
                    {selectedReport.location.address}
                  </p>
                )}
                <p className="text-sm font-mono text-neutral-700">
                  Lat: {(selectedReport.position?.[1] || selectedReport.location?.latitude || 0).toFixed(6)}, Lng:{" "}
                  {(selectedReport.position?.[0] || selectedReport.location?.longitude || 0).toFixed(6)}
                </p>
              </div>

              {/* Current Status */}
              {selectedReport.currentStatus && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Current Status
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-medium ${
                      selectedReport.isVerified ? '' : 'text-neutral-900'
                    }`}>
                      {selectedReport.currentStatus === 'COMPLIANT' 
                        ? 'Compliant'
                        : selectedReport.currentStatus === 'NON_COMPLIANT'
                        ? 'Non-Compliant'
                        : 'Fraudulent'}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Change Controls - Admin only */}
              {isAdmin() && (
                <div className="border-b pb-3">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-900 mb-2">
                      Review & Change Status
                    </p>
                    <p className="text-xs text-amber-700 mb-3">
                      Select a new status to change the report classification, or keep the current status to approve as-is.
                    </p>
                    <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPLIANT">Compliant</SelectItem>
                        <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                        <SelectItem value="FRAUDULENT">Fraudulent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Additional Notes if available */}
              {selectedReport.additionalNotes && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    {selectedReport.kioskId && !selectedReport.agentId ? 'Notes' : 'Agent Notes'}
                  </p>
                  <p className="text-sm text-neutral-900 bg-gray-50 p-2 rounded">
                    {selectedReport.additionalNotes}
                  </p>
                </div>
              )}

              {/* OCR Text if available */}
              {selectedReport.ocrBlobText && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    OCR Text
                  </p>
                  <p className="text-xs text-neutral-700 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto font-mono">
                    {selectedReport.ocrBlobText}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedReport) {
                  const lat = selectedReport.position?.[1] || selectedReport.location?.latitude || 0;
                  const lng = selectedReport.position?.[0] || selectedReport.location?.longitude || 0;
                  window.open(
                    `https://www.google.com/maps?q=${lat},${lng}`,
                    "_blank"
                  );
                }
              }}
            >
              View on Map
            </Button>
            {isAdmin() && (
              <>
                {!isWalletConnected ? (
                  <Button
                    onClick={() => connectWallet()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Connect MetaMask
                  </Button>
                ) : !isWalletAuthorized ? (
                  <Button
                    disabled
                    className="bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  >
                    Unauthorized Wallet
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (selectedReport?.reportId) {
                        handleResolveReport(selectedReport.reportId);
                      }
                    }}
                    disabled={isResolving}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center min-w-[140px]"
                  >
                    {isResolving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>
                    ) : (
                      selectedReport?.isVerified ? 'Update Status' : 'Approve'
                    )}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] bg-slate-900 border-slate-800 p-0 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-900/50 absolute top-0 left-0 right-0 z-10">
            <h2 className="text-white font-medium">Report Image</h2>
            <a 
              href={selectedImage || ''} 
              download="report-image.jpg"
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
          {selectedImage && (
            <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center overflow-auto p-4 custom-scrollbar">
              <img 
                src={selectedImage} 
                alt="Enlarged Report" 
                className="max-w-full max-h-full object-contain rounded" 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}