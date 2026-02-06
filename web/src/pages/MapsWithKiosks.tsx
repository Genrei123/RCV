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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MapsWithKiosks() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
  const [kiosks, setKiosks] = useState<KioskMachine[]>([]);
  const [filteredKiosks, setFilteredKiosks] = useState<KioskMachine[]>([]);
  const [, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"inspectors" | "kiosks">("inspectors");
  const navigate = useNavigate();
  
  // Track Firebase unsubscribe function
  const unsubscribeKiosksRef = useRef<(() => void) | null>(null);

  const isUserActive = (lastSeen?: string | Date): boolean => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const fiveMinutesInMs = 5 * 60 * 1000;
    return now.getTime() - lastSeenDate.getTime() < fiveMinutesInMs;
  };

  useEffect(() => {
    // Load inspectors (non-real-time)
    const loadInspectors = async () => {
      try {
        const users = await FirestoreService.getAllUsers();
        const mappedInspectors: Inspector[] = users
          .filter((user) => user.currentLocation)
          .map((user) => ({
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
                `${user.currentLocation.latitude.toFixed(6)}, ${user.currentLocation.longitude.toFixed(6)}`,
              city: `${user.currentLocation.latitude.toFixed(6)}, ${user.currentLocation.longitude.toFixed(6)}`,
            },
          }));

        setInspectors(mappedInspectors);
        setFilteredInspectors(mappedInspectors);
      } catch (error) {
        console.error("Error loading inspectors:", error);
        setInspectors([]);
        setFilteredInspectors([]);
      }
    };

    loadInspectors();

    // Subscribe to kiosks with real-time updates from Firebase
    unsubscribeKiosksRef.current = KioskManagementService.subscribeToKiosks((kioskData) => {
      setKiosks(kioskData);
      setFilteredKiosks(kioskData);
      setLoading(false);
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
      if (activeTab === "inspectors") {
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
        const filtered = inspectors.filter((i) => matchedIds.has(i.id));
        setFilteredInspectors(filtered);

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
    <div className="h-full w-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "inspectors" | "kiosks")}
        className="h-full w-full"
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <TabsList className="bg-white shadow-lg">
            <TabsTrigger value="inspectors">Inspectors</TabsTrigger>
            <TabsTrigger value="kiosks">Kiosk Machines</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inspectors" className="h-full m-0">
          <MapComponent
            inspectors={filteredInspectors}
            allInspectors={inspectors}
            searchUsers={searchUsers}
            onInspectorClick={handleInspectorClick}
            onSearch={handleSearch}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="kiosks" className="h-full m-0">
          <KioskMapComponent
            kiosks={filteredKiosks}
            onKioskClick={handleKioskClick}
            onSearch={handleSearch}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
