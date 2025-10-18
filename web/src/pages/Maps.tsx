import { MapComponent } from "@/components/MapComponent"
import type { Inspector } from "@/components/MapComponent"
import { FirestoreService } from "@/services/firestore"
import { useEffect, useState } from "react"

export function Maps() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInspectors = async () => {
      try {
        const users = await FirestoreService.getAllUsers();
        console.log('Users from Firebase:', users);
        
        const mappedInspectors: Inspector[] = users
          .filter(user => user.currentLocation)
          .map(user => {
            console.log('Mapping user:', user);
            return {
              id: user._id,
              name: user.fullName,
              role: user.role,
              status: user.status === 'Active' ? 'active' as const : 'inactive' as const,
              lastSeen: user.updatedAt,
              badgeId: user.badgeId,
              location: {
                lat: user.currentLocation.latitude,
                lng: user.currentLocation.longitude,
                address: user.location || `${user.currentLocation.latitude.toFixed(6)}, ${user.currentLocation.longitude.toFixed(6)}`,
                city: `${user.currentLocation.latitude.toFixed(6)}, ${user.currentLocation.longitude.toFixed(6)}`
              }
            };
          });
        
        console.log('Mapped inspectors:', mappedInspectors);
        setInspectors(mappedInspectors);
      } catch (error) {
        console.error('Error loading inspectors:', error);
        setInspectors([]);
      } finally {
        setLoading(false);
      }
    };

    loadInspectors();
  }, []);

  const handleInspectorClick = (inspector: Inspector) => {
    console.log('Inspector clicked:', inspector);
  };

  const handleSearch = (query: string) => {
    console.log('Map search:', query);
  };

  return (
    <div className="h-full w-full">
      <MapComponent
        inspectors={inspectors}
        onInspectorClick={handleInspectorClick}
        onSearch={handleSearch}
        loading={loading}
      />
    </div>
  );
}