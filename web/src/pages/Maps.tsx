import { MapComponent } from "@/components/MapComponent";
import { KioskMapComponent } from "@/components/KioskMapComponent";
import type { Inspector } from "@/components/MapComponent";
import type { KioskMachine } from "@/components/KioskMapComponent";
import { FirestoreService } from "@/services/firestore";
import { DashboardService } from "@/services/dashboardService";
import { KioskManagementService } from "@/services/kioskManagementService";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Users, Monitor } from "lucide-react";

export function Maps() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
  const [kiosks, setKiosks] = useState<KioskMachine[]>([]);
  const [filteredKiosks, setFilteredKiosks] = useState<KioskMachine[]>([]);
  const [, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [kiosksLoading, setKiosksLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"agents" | "kiosks">("agents");
  const navigate = useNavigate();
  
  // Track Firebase unsubscribe function for kiosks
  const unsubscribeKiosksRef = useRef<(() => void) | null>(null);

  // Layout handles sizing/scroll; no body scroll hacks here

  // Determine if a user is currently active (logged in recently) based on lastSeen timestamp
  const isUserActive = (lastSeen?: string | Date): boolean => {
    if (!lastSeen) return false;
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return now.getTime() - lastSeenDate.getTime() < fiveMinutesInMs;
  };

  useEffect(() => {
    // Load inspectors (non-real-time)
    const loadInspectors = async () => {
      try {
        const users = await FirestoreService.getAllUsers();

        const mappedInspectors: Inspector[] = users
          .filter((user) => user.currentLocation)
          .map((user) => {
            return {
              id: user.id,
              name: user.fullName,
              email: user.email,
              role: user.role,
              status: isUserActive(user.updatedAt)
                ? ("active" as const)
                : ("inactive" as const),
              lastSeen: user.updatedAt,
              badgeId: user.badgeId,
              location: {
                lat: user.currentLocation.latitude,
                lng: user.currentLocation.longitude,
                address:
                  user.location ||
                  `${user.currentLocation.latitude.toFixed(
                    6
                  )}, ${user.currentLocation.longitude.toFixed(6)}`,
                city: `${user.currentLocation.latitude.toFixed(
                  6
                )}, ${user.currentLocation.longitude.toFixed(6)}`,
              },
            };
          });

        setInspectors(mappedInspectors);
        setFilteredInspectors(mappedInspectors);
      } catch (error) {
        console.error("Error loading inspectors:", error);
        setInspectors([]);
        setFilteredInspectors([]);
      } finally {
        setLoading(false);
      }
    };

    loadInspectors();

    // Subscribe to kiosks with real-time updates from Firebase
    unsubscribeKiosksRef.current = KioskManagementService.subscribeToKiosks((kioskData) => {
      setKiosks(kioskData);
      setFilteredKiosks(kioskData);
      setKiosksLoading(false);
    });

    // Refresh inspectors periodically
    const interval = setInterval(loadInspectors, 30000);
    
    return () => {
      clearInterval(interval);
      // Unsubscribe from Firebase when component unmounts
      if (unsubscribeKiosksRef.current) {
        unsubscribeKiosksRef.current();
      }
    };
  }, []);

  // Handle view mode change - kiosks are already loaded via real-time subscription
  const handleViewModeChange = (mode: "agents" | "kiosks") => {
    setViewMode(mode);
  };

  const handleInspectorClick = (inspector: Inspector) => {
    if (inspector?.id) {
      navigate(`/users/${inspector.id}`, { state: { userHint: inspector } });
    }
  };

  const handleKioskClick = (kiosk: KioskMachine) => {
    // Navigate to kiosk details or open control panel
    console.log("Kiosk clicked:", kiosk);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredInspectors(inspectors);
      setFilteredKiosks(kiosks);
      setSearchUsers([]);
      return;
    }

    try {
      if (viewMode === "agents") {
        // Search agents/inspectors
        const resp = await DashboardService.getAllUsers();
        const users = resp.users || [];
        const q = query.toLowerCase();
        const matchedUsers = users.filter((u: any) => {
          const parts = [
            u.firstName,
            u.middleName,
            u.lastName,
            u.fullName,
            u.name,
            u.email,
          ]
            .filter(Boolean)
            .map((s: any) => String(s).toLowerCase());
          return parts.some((p: string) => p.includes(q));
        });

        const matchedIds = new Set(matchedUsers.map((u: any) => u._id));

        // Keep only inspectors (with location) whose IDs matched the user search
        const filtered = inspectors.filter((i) => matchedIds.has(i.id));
        setFilteredInspectors(filtered);

        // Build suggestions including users without live locations
        const suggestionUsers = matchedUsers.map((u: any) => {
          const match = inspectors.find((i) => i.id === u._id);
          return {
            id: u._id,
            name:
              u.fullName ||
              u.name ||
              [u.firstName, u.lastName].filter(Boolean).join(" "),
            role: u.role,
            status: match?.status,
            lastSeen: match?.lastSeen,
            badgeId: match?.badgeId,
            location: match?.location,
          };
        });
        setSearchUsers(suggestionUsers);
      } else {
        // Search kiosks
        const q = query.toLowerCase();
        const filtered = kiosks.filter(
          (k) =>
            k.name.toLowerCase().includes(q) ||
            k.location.address.toLowerCase().includes(q) ||
            k.id.toLowerCase().includes(q)
        );
        setFilteredKiosks(filtered);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to local name filter
      if (viewMode === "agents") {
        const searchLower = query.toLowerCase();
        const filtered = inspectors.filter((inspector) =>
          inspector?.name?.toLowerCase().includes(searchLower)
        );
        setFilteredInspectors(filtered);
        setSearchUsers(
          filtered.map((i) => ({
            id: i.id,
            name: i.name,
            role: i.role,
            status: i.status,
            lastSeen: i.lastSeen,
            badgeId: i.badgeId,
            location: i.location,
          }))
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" text="Loading Map..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Map Display */}
      {viewMode === "agents" ? (
        <MapComponent
          inspectors={filteredInspectors}
          allInspectors={inspectors}
          searchUsers={searchUsers}
          onInspectorClick={handleInspectorClick}
          onSearch={handleSearch}
          loading={loading}
          showViewToggle
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      ) : (
        <KioskMapComponent
          kiosks={filteredKiosks}
          onKioskClick={handleKioskClick}
          onSearch={handleSearch}
          loading={kiosksLoading}
          showViewToggle
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      )}
    </div>
  );
}
