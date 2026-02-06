import { useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCw } from "lucide-react";
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
  const [restarting, setRestarting] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleRestartKiosk = async (kioskId: string) => {
    try {
      setRestarting(kioskId);
      await KioskManagementService.restartKiosk(kioskId);
      // Refresh after 3 seconds
      setTimeout(() => {
        setRestarting(null);
      }, 3000);
    } catch (error) {
      console.error("Error restarting kiosk:", error);
      setRestarting(null);
    }
  };

  const getKioskIcon = (kiosk: KioskMachine) => {
    const isOnline = kiosk.status === "online";
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${isOnline ? "#4CAF50" : "#F44336"}" stroke="white" stroke-width="2"/>
          <text x="20" y="26" text-anchor="middle" font-size="20" fill="white" font-family="Arial">🖥️</text>
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
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 max-w-md">
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

      {/* Stats Card */}
      <Card className="absolute top-4 right-4 z-10 p-4 bg-white shadow-lg">
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {kiosks.filter((k) => k.status === "online").length}
            </div>
            <div className="text-xs text-gray-600">Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {kiosks.filter((k) => k.status === "offline").length}
            </div>
            <div className="text-xs text-gray-600">Offline</div>
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
            <div className="p-2 min-w-[250px]">
              <h3 className="font-bold text-lg mb-2">{selectedKiosk.name}</h3>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedKiosk.status === "online" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {selectedKiosk.status === "online" ? "🟢 Online" : "🔴 Offline"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedKiosk.currentMode}
                  </Badge>
                </div>

                <div className="text-sm text-gray-600">
                  <div>📍 {selectedKiosk.location.address}</div>
                  <div>🏙️ {selectedKiosk.location.city}</div>
                  <div>
                    👁️ Last seen: {selectedKiosk.lastSeen 
                      ? new Date(selectedKiosk.lastSeen).toLocaleString()
                      : "Never"
                    }
                  </div>
                </div>

                {selectedKiosk.leds && (
                  <div className="flex gap-2 pt-2 border-t">
                    <div className="text-xs">LEDs:</div>
                    <div className={`w-3 h-3 rounded-full ${selectedKiosk.leds.processing ? "bg-yellow-500" : "bg-gray-300"}`} title="Processing" />
                    <div className={`w-3 h-3 rounded-full ${selectedKiosk.leds.success ? "bg-green-500" : "bg-gray-300"}`} title="Success" />
                    <div className={`w-3 h-3 rounded-full ${selectedKiosk.leds.error ? "bg-red-500" : "bg-gray-300"}`} title="Error" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRestartKiosk(selectedKiosk.id)}
                  disabled={selectedKiosk.status === "offline" || restarting === selectedKiosk.id}
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  {restarting === selectedKiosk.id ? "Restarting..." : "Restart"}
                </Button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
