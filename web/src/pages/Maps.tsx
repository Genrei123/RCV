import { MapComponent } from "@/components/MapComponent";
import type { Inspector } from "@/components/MapComponent";
import { FirestoreService } from "@/services/firestore";
import { DashboardService } from "@/services/dashboardService";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function Maps() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
  const [, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const navigate = useNavigate();

  // Layout handles sizing/scroll; no body scroll hacks here

  useEffect(() => {
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
    if (inspector?.id) {
      navigate(`/users/${inspector.id}`, { state: { userHint: inspector } });
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredInspectors(inspectors);
      setSearchUsers([]);
      return;
    }

    try {
      // Fetch all users through API, then filter by query
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
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to local name filter
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
      <MapComponent
        inspectors={filteredInspectors}
        allInspectors={inspectors}
        searchUsers={searchUsers}
        onInspectorClick={handleInspectorClick}
        onSearch={handleSearch}
        loading={loading}
      />
    </div>
  );
}
