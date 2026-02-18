import { useState, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCw, Power, Lightbulb, MapPin, Clock, Monitor, Wifi, WifiOff } from "lucide-react";
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

  if (!isLoaded) {
    return <div className="h-full w-full flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="relative h-full w-full">
      {/* Search Bar - positioned to avoid map controls and tabs */}
      <div className="absolute top-16 left-4 right-4 md:right-auto z-10 w-full md:w-96 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search kiosk by name or location..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 bg-white shadow-lg"
          />
        </div>
      </div>

      {/* Stats Card - positioned to avoid map controls */}
      <Card className="absolute bottom-20 md:bottom-16 left-1/2 -translate-x-1/2 z-10 p-3 bg-white shadow-lg">
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
            <div className="p-3 min-w-[280px]">
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
