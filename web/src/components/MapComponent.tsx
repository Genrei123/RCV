// Google Maps Component - See GOOGLE_MAPS_SETUP.md for configuration
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
export interface Inspector {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive";
  lastSeen?: string;
  badgeId?: string;
  location: { lat: number; lng: number; address: string; city: string };
}

type Suggestion = {
  id: string;
  name: string;
  role?: string;
  status?: "active" | "inactive";
  lastSeen?: string;
  badgeId?: string;
  location?: { lat: number; lng: number; address: string; city: string };
};

interface MapComponentProps {
  inspectors?: Inspector[];
  onInspectorClick?: (inspector: Inspector) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  allInspectors?: Inspector[]; // for local suggestions when API results absent
  searchUsers?: Suggestion[]; // may include users without locations
}

declare global {
  interface Window {
    google: any;
  }
}

export function MapComponent({
  inspectors = [],
  onInspectorClick,
  onSearch,
  loading = false,
  allInspectors = [],
  searchUsers = [],
}: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const markersByIdRef = useRef<Map<string, any>>(new Map());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inspectorCountRef = useRef<HTMLDivElement>(null);
  const originalSearchParentRef = useRef<HTMLElement | null>(null);
  const originalCountParentRef = useRef<HTMLElement | null>(null);
  const [elementsMovedDown, setElementsMovedDown] = useState(false);
  const elementsMovedDownRef = useRef(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;
    const center =
      inspectors.length > 0
        ? {
            lat:
              inspectors.reduce((s, i) => s + i.location.lat, 0) /
              inspectors.length,
            lng:
              inspectors.reduce((s, i) => s + i.location.lng, 0) /
              inspectors.length,
          }
        : { lat: 14.5995, lng: 120.9842 };
    const mapStyles = [
      {
        elementType: "geometry",
        stylers: [{ color: "#f5f5f5" }, { lightness: 15 }],
      },
      { elementType: "labels.text.fill", stylers: [{ color: "#6b6b6b" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ lightness: -10 }, { saturation: 20 }],
      },
      {
        featureType: "water",
        stylers: [{ color: "#cfe8ff" }, { lightness: 40 }],
      },
      { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    ];

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.SATELLITE,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: mapStyles,
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Move elements down initially to avoid blocking Google watermark OK button
    setElementsMovedDown(true);
    elementsMovedDownRef.current = true;

    // Listen for clicks on the map (including watermark OK button)
    const handleMapClick = () => {
      // Restore elements to original position when map is clicked
      if (elementsMovedDownRef.current) {
        setElementsMovedDown(false);
        elementsMovedDownRef.current = false;
      }
    };

    googleMapRef.current.addListener('click', handleMapClick);

    return () => {
      if (googleMapRef.current) {
        window.google.maps.event.clearListeners(googleMapRef.current, 'click');
      }
    };
  }, [mapLoaded, inspectors]);

  // Render markers for filtered inspectors
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markersByIdRef.current.clear();

    const svgMarkerDataUrl = (color: string, size = 48) => {
      const svg = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
          <defs>
            <filter id="f" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
            </filter>
          </defs>
          <g filter="url(#f)">
            <path d="M12 2C8 2 5 5 5 9c0 6.5 7 11 7 11s7-4.5 7-11c0-4-3-7-7-7z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
            <circle cx="12" cy="9" r="3" fill="#ffffff"/>
          </g>
        </svg>
      `);
      return `data:image/svg+xml;charset=UTF-8,${svg}`;
    };

    inspectors.forEach((inspector) => {
      const color = inspector.status === "active" ? "#10b981" : "#ef4444";
      const iconUrl = svgMarkerDataUrl(color, 48);
      const marker = new window.google.maps.Marker({
        position: { lat: inspector.location.lat, lng: inspector.location.lng },
        map: googleMapRef.current,
        title: inspector.name,
        icon: {
          url: iconUrl,
          scaledSize: new window.google.maps.Size(48, 48),
          anchor: new window.google.maps.Point(24, 48),
        },
        zIndex: 9999,
      });
      markersByIdRef.current.set(inspector.id, marker);
      marker.addListener("click", () => {
        const statusColor =
          inspector.status === "active" ? "#10b981" : "#6b7280";
        const lastSeenText = inspector.lastSeen
          ? `<p class="my-1 text-gray-500 text-xs">Last Seen: ${new Date(
              inspector.lastSeen
            ).toLocaleString()}</p>`
          : "";
        const badgeText = inspector.badgeId
          ? `<p class="my-1 text-emerald-600 text-xs font-medium">Badge: ${inspector.badgeId}</p>`
          : "";
        infoWindowRef.current.setContent(
          `<div class="p-4 font-sans min-w-[200px] rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full" style="background-color: ${statusColor};"></div>
              <h3 class="m-0 text-base font-semibold text-gray-800">${inspector.name}</h3>
            </div>
            <p class="my-1 text-emerald-600 font-medium text-sm">${inspector.role}</p>
            ${badgeText}
            <p class="my-1 text-gray-600 text-xs">Location: ${inspector.location.address}</p>
            ${lastSeenText}
          </div>`
        );
        infoWindowRef.current.open(googleMapRef.current, marker);
        onInspectorClick?.(inspector);
      });
      markersRef.current.push(marker);
    });

    if (inspectors.length > 0) {
      if (inspectors.length === 1) {
        const inspector = inspectors[0];
        const position = {
          lat: inspector.location.lat,
          lng: inspector.location.lng,
        };
        googleMapRef.current.panTo(position);
        googleMapRef.current.setZoom(16);
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        inspectors.forEach((i) =>
          bounds.extend({ lat: i.location.lat, lng: i.location.lng })
        );
        googleMapRef.current.fitBounds(bounds);
      }
    }
  }, [inspectors, mapLoaded, onInspectorClick]);

  // Store original parent references on mount
  useEffect(() => {
    if (searchContainerRef.current?.parentElement && !originalSearchParentRef.current) {
      originalSearchParentRef.current = searchContainerRef.current.parentElement;
    }
    if (inspectorCountRef.current?.parentElement && !originalCountParentRef.current) {
      originalCountParentRef.current = inspectorCountRef.current.parentElement;
    }
  }, []);

  // Ensure elements stay in correct position after re-renders when in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const fullscreenElement = document.fullscreenElement || 
                              (document as any).webkitFullscreenElement ||
                              (document as any).mozFullScreenElement ||
                              (document as any).msFullscreenElement;

    if (fullscreenElement) {
      // Ensure elements are in fullscreen container after render
      if (searchContainerRef.current && searchContainerRef.current.parentElement !== fullscreenElement) {
        fullscreenElement.appendChild(searchContainerRef.current);
      }
      if (inspectorCountRef.current && inspectorCountRef.current.parentElement !== fullscreenElement) {
        fullscreenElement.appendChild(inspectorCountRef.current);
      }
    }
  }, [isFullscreen, searchQuery, inspectors.length]);

  // Track fullscreen state and move overlay elements
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                                (document as any).webkitFullscreenElement ||
                                (document as any).mozFullScreenElement ||
                                (document as any).msFullscreenElement;
      const nowFullscreen = !!fullscreenElement;
      setIsFullscreen(nowFullscreen);

      // Use setTimeout to ensure DOM is ready after fullscreen transition
      setTimeout(() => {
        if (searchContainerRef.current && inspectorCountRef.current) {
          // Ensure original parents are stored
          if (!originalSearchParentRef.current && searchContainerRef.current.parentElement) {
            originalSearchParentRef.current = searchContainerRef.current.parentElement;
          }
          if (!originalCountParentRef.current && inspectorCountRef.current.parentElement) {
            originalCountParentRef.current = inspectorCountRef.current.parentElement;
          }

          if (nowFullscreen) {
            // Move to fullscreen element if not already there
            if (fullscreenElement && searchContainerRef.current.parentElement !== fullscreenElement) {
              fullscreenElement.appendChild(searchContainerRef.current);
            }
            if (fullscreenElement && inspectorCountRef.current.parentElement !== fullscreenElement) {
              fullscreenElement.appendChild(inspectorCountRef.current);
            }
          } else {
            // Move back to original parents
            if (originalSearchParentRef.current && searchContainerRef.current.parentElement !== originalSearchParentRef.current) {
              originalSearchParentRef.current.appendChild(searchContainerRef.current);
            }
            if (originalCountParentRef.current && inspectorCountRef.current.parentElement !== originalCountParentRef.current) {
              originalCountParentRef.current.appendChild(inspectorCountRef.current);
            }
          }
        }
      }, 0);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Update ref when state changes
  useEffect(() => {
    elementsMovedDownRef.current = elementsMovedDown;
  }, [elementsMovedDown]);

  // Detect clicks anywhere (including watermark OK button) to restore element positions
  useEffect(() => {
    if (!elementsMovedDown) return;

    const handleDocumentClick = (e: MouseEvent) => {
      // Check if click is on or near the map area (where watermark OK button might be)
      const target = e.target as HTMLElement;
      
      // Check if click is on Google Maps watermark/controls
      const isGoogleElement = target.closest('[class*="gm-"]') || 
                             target.closest('[id*="google"]') ||
                             target.textContent?.includes('OK') ||
                             target.textContent?.includes('For development');
      
      // Check if click is in the lower portion of the viewport (where watermark typically appears)
      const isLowerArea = e.clientY > window.innerHeight * 0.6;
      
      if (isGoogleElement || isLowerArea) {
        // Restore elements to original position
        setElementsMovedDown(false);
        elementsMovedDownRef.current = false;
      }
    };

    // Use capture phase to catch events before they're stopped
    document.addEventListener('click', handleDocumentClick, true);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [elementsMovedDown]);

  // Build suggestions from API results first, then local lists
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const base: Suggestion[] = (
      searchUsers?.length
        ? searchUsers
        : allInspectors?.length
        ? allInspectors
        : inspectors
    ) as Suggestion[];
    const next = base
      .filter((i) => i?.name?.toLowerCase().includes(q))
      .slice(0, 10);
    setSuggestions(next);
  }, [searchQuery, searchUsers, allInspectors, inspectors]);

  // Focus a marker once it's rendered after filtering
  useEffect(() => {
    if (!pendingFocusId) return;
    const marker = markersByIdRef.current.get(pendingFocusId);
    const match = (inspectors || []).find((i) => i.id === pendingFocusId);
    if (marker && match && googleMapRef.current) {
      googleMapRef.current.panTo({
        lat: match.location.lat,
        lng: match.location.lng,
      });
      const statusColor = match.status === "active" ? "#10b981" : "#6b7280";
      const lastSeenText = match.lastSeen
        ? `<p class="my-1 text-gray-500 text-xs">Last Seen: ${new Date(
            match.lastSeen
          ).toLocaleString()}</p>`
        : "";
      const badgeText = match.badgeId
        ? `<p class="my-1 text-emerald-600 text-xs font-medium">Badge: ${match.badgeId}</p>`
        : "";
      infoWindowRef.current.setContent(
        `<div class="p-4 font-sans min-w-[200px] rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full" style="background-color: ${statusColor};"></div>
              <h3 class="m-0 text-base font-semibold text-gray-800">${match.name}</h3>
            </div>
            <p class="my-1 text-emerald-600 font-medium text-sm">${match.role}</p>
            ${badgeText}
            <p class="my-1 text-gray-600 text-xs">Location: ${match.location.address}</p>
            ${lastSeenText}
          </div>`
      );
      infoWindowRef.current.open(googleMapRef.current, marker);
      setPendingFocusId(null);
      setSearchQuery("");
    }
  }, [inspectors, pendingFocusId]);

  if (loading)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-gray-200 border-t-teal-600"></div>
      </div>
    );
  if (mapError)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Card className="p-8">
          <p className="text-red-600">
            Map unavailable. Check GOOGLE_MAPS_SETUP.md
          </p>
        </Card>
      </div>
    );

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Mobile Search - Form visible, compact width */}
      <div className="md:hidden fixed top-18 left-2 z-50 w-64">
        <Card className="bg-white rounded-lg shadow-lg">
          <div className="relative p-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search inspectors..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                setTimeout(() => onSearch?.(value), 50);
              }}
              className="pl-10 pr-10 bg-white rounded-md shadow-none focus:outline-none focus:ring-1"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  onSearch?.("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {searchQuery && (
            <div className="max-h-60 overflow-y-auto bg-white rounded-b-lg">
              {suggestions.length > 0 ? (
                suggestions.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      if (i.location) {
                        const marker = markersByIdRef.current.get(i.id);
                        if (marker && googleMapRef.current) {
                          googleMapRef.current.panTo({
                            lat: i.location.lat,
                            lng: i.location.lng,
                          });
                          const statusColor =
                            i.status === "active" ? "#10b981" : "#6b7280";
                          const lastSeenText = i.lastSeen
                            ? `<p class=\"my-1 text-gray-500 text-xs\">Last Seen: ${new Date(
                                i.lastSeen
                              ).toLocaleString()}</p>`
                            : "";
                          const badgeText = i.badgeId
                            ? `<p class=\"my-1 text-emerald-600 text-xs font-medium\">Badge: ${i.badgeId}</p>`
                            : "";
                          infoWindowRef.current.setContent(
                            `<div class=\"p-4 font-sans min-w-[200px] rounded-lg\">\n            <div class=\"flex items-center gap-2 mb-2\">\n              <div class=\"w-2 h-2 rounded-full\" style=\"background-color: ${statusColor};\"></div>\n              <h3 class=\"m-0 text-base font-semibold text-gray-800\">${
                              i.name
                            }</h3>\n            </div>\n            <p class=\"my-1 text-emerald-600 font-medium text-sm\">${
                              i.role || ""
                            }</p>\n            ${badgeText}\n            <p class=\"my-1 text-gray-600 text-xs\">Location: ${
                              i.location.address
                            }</p>\n            ${lastSeenText}\n          </div>`
                          );
                          infoWindowRef.current.open(
                            googleMapRef.current,
                            marker
                          );
                          setSearchQuery("");
                        } else {
                          setPendingFocusId(i.id);
                          onSearch?.(i.name);
                        }
                      } else {
                        onSearch?.(i.name);
                        setSearchQuery("");
                      }
                      onInspectorClick?.(i as unknown as Inspector);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-1 focus:outline-none border-b last:border-b-0 text-sm"
                  >
                    <span className="font-medium text-gray-800">
                      {i.name}
                    </span>
                    <p className="text-xs text-gray-500">
                      {i.location?.city || "No live location"}
                    </p>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No matches
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Desktop Search panel */}
      <div 
        ref={searchContainerRef}
        className={`hidden md:block ${isFullscreen ? 'fixed' : 'absolute'} top-4 left-3 lg:left-4 z-[50] w-80 md:w-96 max-w-[28rem]`}
        style={{ pointerEvents: 'auto' }}
      >
        <Card className="bg-white rounded-none sm:rounded-lg border-0 shadow-xl m-0 sm:m-0" style={{ pointerEvents: 'auto' }}>
          <div className="relative p-2 sm:p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search inspectors..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                setTimeout(() => onSearch?.(value), 50);
              }}
              className="pl-12 pr-10 bg-white rounded-md border-0 shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  onSearch?.("");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-1 max-h-60 overflow-y-auto bg-white rounded-b-lg shadow-sm">
              {suggestions.length > 0 ? (
                suggestions.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      if (i.location) {
                        const marker = markersByIdRef.current.get(i.id);
                        if (marker && googleMapRef.current) {
                          googleMapRef.current.panTo({
                            lat: i.location.lat,
                            lng: i.location.lng,
                          });
                          const statusColor =
                            i.status === "active" ? "#10b981" : "#6b7280";
                          const lastSeenText = i.lastSeen
                            ? `<p class=\"my-1 text-gray-500 text-xs\">Last Seen: ${new Date(
                                i.lastSeen
                              ).toLocaleString()}</p>`
                            : "";
                          const badgeText = i.badgeId
                            ? `<p class=\"my-1 text-emerald-600 text-xs font-medium\">Badge: ${i.badgeId}</p>`
                            : "";
                          infoWindowRef.current.setContent(
                            `<div class=\"p-4 font-sans min-w-[200px] rounded-lg\">\n            <div class=\"flex items-center gap-2 mb-2\">\n              <div class=\"w-2 h-2 rounded-full\" style=\"background-color: ${statusColor};\"></div>\n              <h3 class=\"m-0 text-base font-semibold text-gray-800\">${
                              i.name
                            }</h3>\n            </div>\n            <p class=\"my-1 text-emerald-600 font-medium text-sm\">${
                              i.role || ""
                            }</p>\n            ${badgeText}\n            <p class=\"my-1 text-gray-600 text-xs\">Location: ${
                              i.location.address
                            }</p>\n            ${lastSeenText}\n          </div>`
                          );
                          infoWindowRef.current.open(
                            googleMapRef.current,
                            marker
                          );
                          setSearchQuery("");
                        } else {
                          setPendingFocusId(i.id);
                          onSearch?.(i.name);
                        }
                      } else {
                        // No live location — still trigger parent filtering so user sees no markers
                        onSearch?.(i.name);
                        setSearchQuery("");
                      }
                      onInspectorClick?.(i as unknown as Inspector);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-1 focus:outline-none"
                  >
                    <span className="font-medium text-sm text-gray-800">
                      {i.name}
                    </span>
                    <p className="text-xs text-gray-500">
                      {i.location?.city || "No live location"}
                    </p>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No matches
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Inspector count container: bottom center */}
      <div 
        ref={inspectorCountRef}
        className={`${isFullscreen ? 'fixed' : 'absolute'} bottom-6 left-1/2 -translate-x-1/2 z-[51]`}
        style={{ 
          pointerEvents: 'auto'
        }}
      >
        <Card className="bg-white shadow-lg px-4 py-2" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 app-text-primary" />
            <span className="text-sm font-semibold">
              {inspectors.length} Inspectors
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
