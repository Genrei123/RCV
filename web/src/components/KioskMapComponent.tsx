import { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, X, RotateCw, Power, Lightbulb, MapPin, Clock, Monitor, Wifi, WifiOff } from "lucide-react";
import { KioskManagementService } from "@/services/kioskManagementService";

export interface KioskMachine {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeen?: string | Date;
  currentMode: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  leds?: {
    processing: boolean;
    success: boolean;
    error: boolean;
  };
}

interface KioskMapComponentProps {
  kiosks: KioskMachine[];
  onKioskClick: (kiosk: KioskMachine) => void;
  onSearch: (query: string) => void;
  loading?: boolean;
  viewMode?: "agents" | "kiosks";
  onViewModeChange?: (mode: "agents" | "kiosks") => void;
  showViewToggle?: boolean;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 14.5995,
  lng: 120.9842, // Manila, Philippines
};

export function KioskMapComponent({
  kiosks,
  onKioskClick,
  onSearch,
}: KioskMapComponentProps) {
  const [selectedKiosk, setSelectedKiosk] = useState<KioskMachine | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<{ kioskId: string; message: string; success: boolean } | null>(null);
  const toggleContainerRef = useRef<HTMLDivElement | null>(null);
  const originalToggleParentRef = useRef<HTMLElement | null>(null);

  // Clear command status after 3 seconds
  useEffect(() => {
    if (commandStatus) {
      const timer = setTimeout(() => setCommandStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [commandStatus]);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleCommand = async (
    kioskId: string, 
    commandName: string, 
    commandFn: () => Promise<boolean>
  ) => {
    try {
      setCommandLoading(commandName);
      const success = await commandFn();
      setCommandStatus({
        kioskId,
        message: success ? `${commandName} sent successfully` : `Failed to send ${commandName}`,
        success,
      });
    } catch (error) {
      console.error(`Error with command ${commandName}:`, error);
      setCommandStatus({
        kioskId,
        message: `Error: ${commandName} failed`,
        success: false,
      });
    } finally {
      setCommandLoading(null);
    }
  };

  const handleRestartKiosk = (kioskId: string) => {
    handleCommand(kioskId, 'Restart', () => KioskManagementService.restartKiosk(kioskId));
  };

  const handleShutdownKiosk = (kioskId: string) => {
    handleCommand(kioskId, 'Shutdown', () => KioskManagementService.shutdownKiosk(kioskId));
  };

  const handleCloseApp = (kioskId: string) => {
    handleCommand(kioskId, 'Close Application', () => KioskManagementService.closeApp(kioskId));
  };

  const handleTestLEDs = (kioskId: string) => {
    handleCommand(kioskId, 'Test LEDs', () => KioskManagementService.testAllLEDs(kioskId));
  };

  const formatLastSeen = (lastSeen?: string | Date): string => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getKioskIcon = (kiosk: KioskMachine) => {
    const isOnline = kiosk.status === "online";
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${isOnline ? "#4CAF50" : "#F44336"}" stroke="white" stroke-width="2"/>
          <rect x="12" y="10" width="16" height="12" rx="1" fill="white"/>
          <rect x="14" y="24" width="12" height="2" fill="white"/>
          <rect x="16" y="26" width="8" height="4" fill="white"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 40),
    };
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      const nowFullscreen = !!fullscreenElement;

      setTimeout(() => {
        if (!toggleContainerRef.current) return;

        if (!originalToggleParentRef.current && toggleContainerRef.current.parentElement) {
          originalToggleParentRef.current = toggleContainerRef.current.parentElement;
        }

        if (nowFullscreen) {
          if (fullscreenElement && toggleContainerRef.current.parentElement !== fullscreenElement) {
            fullscreenElement.appendChild(toggleContainerRef.current);
          }
        } else {
          if (
            originalToggleParentRef.current &&
            toggleContainerRef.current.parentElement !== originalToggleParentRef.current
          ) {
            originalToggleParentRef.current.appendChild(toggleContainerRef.current);
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

  if (!isLoaded) {
    return <div className="h-full w-full flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="relative h-full w-full">
      {/* Search Bar - Large screens only */}
      <div className="hidden lg:block absolute top-16 lg:top-16 left-3 lg:left-4 z-9999 w-80 md:w-96 max-w-md" style={{ pointerEvents: 'auto' }}>

        <Card className="bg-white rounded-none sm:rounded-lg border-0 shadow-xl m-0" style={{ pointerEvents: 'auto' }}>
          <div className="relative p-2 sm:p-2" style={{ pointerEvents: 'auto' }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search kiosk by name or location..."
              value={searchQuery}
              onChange={handleSearchChange}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
              className="pl-12 pr-10 bg-white rounded-md border-0 shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                onClick={(e) => { e.stopPropagation(); setSearchQuery(""); onSearch(""); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                style={{ pointerEvents: 'auto' }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Stats Card - left on mobile, right on desktop */}
      <Card className="absolute top-32 md:top-16 left-4 md:right-4 md:left-auto z-10 p-3 bg-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-600">
              {kiosks.filter((k) => k.status === "online").length}
            </span>
            <span className="text-xs text-gray-500">Online</span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-red-600">
              {kiosks.filter((k) => k.status === "offline").length}
            </span>
            <span className="text-xs text-gray-500">Offline</span>
          </div>
        </div>
      </Card>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={kiosks.length > 0 ? kiosks[0].location : defaultCenter}
        zoom={12}
      >
        {kiosks.map((kiosk) => (
          <Marker
            key={kiosk.id}
            position={kiosk.location}
            icon={getKioskIcon(kiosk)}
            onClick={() => {
              setSelectedKiosk(kiosk);
              onKioskClick(kiosk);
            }}
          />
        ))}

        {selectedKiosk && (
          <InfoWindow
            position={selectedKiosk.location}
            onCloseClick={() => setSelectedKiosk(null)}
          >
            <div className="p-3 min-w-70">
              <h3 className="font-bold text-lg mb-2">{selectedKiosk.name}</h3>
              
              {/* Command Status Message */}
              {commandStatus && commandStatus.kioskId === selectedKiosk.id && (
                <div className={`text-xs mb-2 p-2 rounded ${
                  commandStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {commandStatus.message}
                </div>
              )}
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedKiosk.status === "online" ? "default" : "destructive"}
                    className="text-xs flex items-center gap-1"
                  >
                    {selectedKiosk.status === "online" ? (
                      <><Wifi className="h-3 w-3" /> Online</>
                    ) : (
                      <><WifiOff className="h-3 w-3" /> Offline</>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    {selectedKiosk.currentMode}
                  </Badge>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span>{selectedKiosk.location.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>Last seen: {formatLastSeen(selectedKiosk.lastSeen)}</span>
                  </div>
                </div>

                {selectedKiosk.leds && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-gray-500">LEDs:</span>
                    <div className={`w-3 h-3 rounded-full ${selectedKiosk.leds.processing ? "bg-yellow-500 animate-pulse" : "bg-gray-300"}`} title="Processing" />
                    <div className={`w-3 h-3 rounded-full ${selectedKiosk.leds.success ? "bg-green-500" : "bg-gray-300"}`} title="Success" />
                    <div className={`w-3 h-3 rounded-full ${selectedKiosk.leds.error ? "bg-red-500" : "bg-gray-300"}`} title="Error" />
                  </div>
                )}
              </div>

              {/* Command Buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRestartKiosk(selectedKiosk.id)}
                    disabled={selectedKiosk.status === "offline" || commandLoading !== null}
                  >
                    <RotateCw className={`h-3 w-3 mr-1 ${commandLoading === 'Restart' ? 'animate-spin' : ''}`} />
                    Restart
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleTestLEDs(selectedKiosk.id)}
                    disabled={selectedKiosk.status === "offline" || commandLoading !== null}
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Test LEDs
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleShutdownKiosk(selectedKiosk.id)}
                  disabled={selectedKiosk.status === "offline" || commandLoading !== null}
                >
                  <Power className="h-3 w-3 mr-1" />
                  Shutdown
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleCloseApp(selectedKiosk.id)}
                  disabled={selectedKiosk.status === "offline" || commandLoading !== null}
                  title="Close the kiosk app for maintenance. It will NOT auto-restart."
                >
                  <Power className="h-3 w-3 mr-1" />
                  Close Application
                </Button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
