// Google Maps Component - See GOOGLE_MAPS_SETUP.md for configuration
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Inspector {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  lastSeen?: string;
  badgeId?: string;
  location: { lat: number; lng: number; address: string; city: string; };
}

interface MapComponentProps {
  inspectors?: Inspector[];
  onInspectorClick?: (inspector: Inspector) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
}

declare global {
  interface Window { google: any; }
}

export function MapComponent({
  inspectors = [],
  onInspectorClick,
  onSearch,
  loading = false,
}: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(
    null
  );
  const [filteredInspectors, setFilteredInspectors] =
    useState<Inspector[]>(inspectors);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInspectors(inspectors);
    } else {
      const filtered = inspectors.filter(
        (inspector) =>
          inspector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inspector.location.city
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          inspector.location.address
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
      setFilteredInspectors(filtered);
    }
  }, [searchQuery, inspectors]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setMapError(true); return }
    if (window.google?.maps) { setMapLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () => setMapError(true)
    document.head.appendChild(script)
  }, [])

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

    filteredInspectors.forEach((inspector) => {
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
      marker.addListener("click", () => {
        const statusColor = inspector.status === 'active' ? '#10b981' : '#6b7280';
        const lastSeenText = inspector.lastSeen 
          ? `<p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Last Seen: ${new Date(inspector.lastSeen).toLocaleString()}</p>`
          : '';
        const badgeText = inspector.badgeId 
          ? `<p style="margin: 4px 0; color: #059669; font-size: 12px; font-weight: 500;">Badge: ${inspector.badgeId}</p>`
          : '';
        
        infoWindowRef.current.setContent(
          `<div style="
            padding: 16px; 
            font-family: system-ui, -apple-system, sans-serif; 
            min-width: 200px;
            border-radius: 8px;
          ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="
                width: 8px; 
                height: 8px; 
                background-color: ${statusColor}; 
                border-radius: 50%;
              "></div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${inspector.name}</h3>
            </div>
            <p style="margin: 4px 0; color: #059669; font-weight: 500; font-size: 14px;">${inspector.role}</p>
            ${badgeText}
            <p style="margin: 4px 0; color: #4b5563; font-size: 13px;">Location: ${inspector.location.address}</p>
            ${lastSeenText}
          </div>`
        );
        infoWindowRef.current.open(googleMapRef.current, marker);
        setSelectedInspector(inspector);
        onInspectorClick?.(inspector);
      });
      markersRef.current.push(marker);
    });
    if (filteredInspectors.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredInspectors.forEach((i) =>
        bounds.extend({ lat: i.location.lat, lng: i.location.lng })
      );
      googleMapRef.current.fitBounds(bounds);
    }
  }, [filteredInspectors, mapLoaded, onInspectorClick]);

  if (loading)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-teal-600"></div>
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
      <div className="absolute top-4 left-4 z-10 w-96">
        <Card className="bg-white rounded-lg border-0 shadow-none">
          <div className="relative p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search inspectors..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              className="pl-12 pr-10 bg-white rounded-md border-0 shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && filteredInspectors.length > 0 && (
            <div className="mt-1 max-h-60 overflow-y-auto bg-white rounded-b-lg shadow-sm">
              {filteredInspectors.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    setSelectedInspector(i);
                    setSearchQuery("");
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
      {selectedInspector && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-2xl mx-auto">
          <Card className="shadow-2xl border-l-4 bg-white border-l-teal-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <User className="h-12 w-12 text-teal-600 bg-teal-50 p-2 rounded-full" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    selectedInspector.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{selectedInspector.name}</h3>
                  <p className="text-sm text-teal-600 font-medium">{selectedInspector.role}</p>
                  {selectedInspector.badgeId && (
                    <p className="text-xs text-gray-500">Badge ID: {selectedInspector.badgeId}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge className={`${
                  selectedInspector.status === 'active' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-gray-100 text-gray-800 border-gray-300'
                }`}>
                  {selectedInspector.status}
                </Badge>
                <button 
                  onClick={() => setSelectedInspector(null)}
                  className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <p className="text-sm text-gray-600">{selectedInspector.location.address}</p>
              </div>
              
              {selectedInspector.lastSeen && (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 flex items-center justify-center">
                    <div className="h-2 w-2 bg-gray-400 rounded-full" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Last Seen Online: {new Date(selectedInspector.lastSeen).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      <div className="absolute top-4 right-4 z-10">
        <Card className="shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 bg-white text-teal-600" />
            <span className="text-sm font-semibold">
              {filteredInspectors.length} Inspectors
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
