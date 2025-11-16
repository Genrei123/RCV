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

interface MapComponentProps {
  inspectors?: Inspector[];
  onInspectorClick?: (inspector: Inspector) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
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
}: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const markersByIdRef = useRef<Map<string, any>>(new Map());

  // Use inspectors directly from props (already filtered by parent component)

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
    // quieter, desaturated map style so markers stand out
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
  }, [mapLoaded, inspectors]);

  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markersByIdRef.current.clear();
    // helper to build an SVG marker with white stroke and drop shadow
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
        const position = { lat: inspector.location.lat, lng: inspector.location.lng };
        
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
      <div className="absolute top-15 left-2 z-10 w-96">
        <Card className="bg-white rounded-lg border-0 shadow-none">
          <div className="relative p-2">
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
          {searchQuery && inspectors.length > 0 && (
            <div className="mt-1 max-h-60 overflow-y-auto bg-white rounded-b-lg shadow-sm">
              {inspectors.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    // Center map and open info window for the selected inspector
                    const marker = markersByIdRef.current.get(i.id);
                    if (marker && googleMapRef.current) {
                      googleMapRef.current.panTo({
                        lat: i.location.lat,
                        lng: i.location.lng,
                      });
                      const statusColor =
                        i.status === "active" ? "#10b981" : "#6b7280";
                      const lastSeenText = i.lastSeen
                        ? `<p class="my-1 text-gray-500 text-xs">Last Seen: ${new Date(
                            i.lastSeen
                          ).toLocaleString()}</p>`
                        : "";
                      const badgeText = i.badgeId
                        ? `<p class="my-1 text-emerald-600 text-xs font-medium">Badge: ${i.badgeId}</p>`
                        : "";
                      infoWindowRef.current.setContent(
                        `<div class="p-4 font-sans min-w-[200px] rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full" style="background-color: ${statusColor};"></div>
              <h3 class="m-0 text-base font-semibold text-gray-800">${i.name}</h3>
            </div>
            <p class="my-1 text-emerald-600 font-medium text-sm">${i.role}</p>
            ${badgeText}
            <p class="my-1 text-gray-600 text-xs">Location: ${i.location.address}</p>
            ${lastSeenText}
          </div>`
                      );
                      infoWindowRef.current.open(googleMapRef.current, marker);
                    }
                    setSearchQuery("");
                    onInspectorClick?.(i);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-1 focus:outline-none"
                >
                  <span className="font-medium text-sm text-gray-800">
                    {i.name}
                  </span>
                  <p className="text-xs text-gray-500">{i.location.city}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <Card className="bg-white shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-semibold">
              {inspectors.length} Inspectors
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
