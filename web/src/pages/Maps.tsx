import { MapComponent } from "@/components/MapComponent";
import type { Inspector } from "@/components/MapComponent";
import { FirestoreService } from "@/services/firestore";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function Maps() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Disable page scrolling while on the Maps page to avoid revealing any footer,
    // but keep the map itself fully interactive (panning/zooming still works).
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const loadInspectors = async () => {
      try {
        const users = await FirestoreService.getAllUsers();
        console.log("Users from Firebase:", users);

        const mappedInspectors: Inspector[] = users
          .filter((user) => user.currentLocation)
          .map((user) => {
            console.log("Mapping user:", user);
            return {
              id: user._id,
              name: user.fullName,
              role: user.role,
              status:
                user.status === "Active"
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

        console.log("Mapped inspectors:", mappedInspectors);
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
  }, []);

  const handleInspectorClick = (inspector: Inspector) => {
    console.log("Inspector clicked:", inspector);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredInspectors(inspectors);
      return;
    }
    
    try {
      // yung search dito inspector names lang
      const filtered = inspectors.filter(inspector => {
        if (!inspector || !inspector.name) return false;
        
        const searchLower = query.toLowerCase();
        const name = inspector.name.toLowerCase();
        
        return name.includes(searchLower);
      });
      
      setFilteredInspectors(filtered);
      
    } catch (error) {
      console.error("Search error:", error);
      setFilteredInspectors(inspectors);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading Map..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MapComponent
        inspectors={filteredInspectors}
        onInspectorClick={handleInspectorClick}
        onSearch={handleSearch}
        loading={loading}
      />
    </div>
  );
}
