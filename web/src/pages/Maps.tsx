import { MapComponent } from "@/components/MapComponent"
import type { Inspector } from "@/components/MapComponent"

export function Maps() {
  // Updated inspectors data to match the mockup
  const inspectors: Inspector[] = [
    {
      id: "1",
      name: "Gizelle Fungo",
      role: "Food Inspector",
      status: "active",
      location: {
        lat: 14.5995,
        lng: 120.9842,
        address: "Makati Business District",
        city: "Makati"
      }
    },
    {
      id: "2", 
      name: "Winter Cruz",
      role: "Food Inspector",
      status: "active",
      location: {
        lat: 14.6091,
        lng: 121.0223,
        address: "Ortigas Center",
        city: "Pasig"
      }
    },
    {
      id: "3",
      name: "Karina Data Crud",
      role: "Food Inspector", 
      status: "active",
      location: {
        lat: 14.5794,
        lng: 121.0359,
        address: "BGC, Taguig",
        city: "Taguig"
      }
    },
    {
      id: "4",
      name: "Nitinging Torres",
      role: "Food Inspector",
      status: "active", 
      location: {
        lat: 14.6760,
        lng: 121.0437,
        address: "Quezon City Hall",
        city: "Quezon City"
      }
    },
    {
      id: "5",
      name: "John Doe",
      role: "Food Inspector",
      status: "inactive",
      location: {
        lat: 14.5547,
        lng: 121.0244,
        address: "Manila City Hall",
        city: "Manila"
      }
    },
    {
      id: "6",
      name: "Lorem Chon",
      role: "Food Inspector",
      status: "active",
      location: {
        lat: 14.5378,
        lng: 121.0014,
        address: "Malate District",
        city: "Manila"
      }
    }
  ];

  const handleInspectorClick = (inspector: Inspector) => {
    console.log('Inspector clicked:', inspector);
    // Handle inspector selection - navigate to profile, show details, etc.
  };

  const handleSearch = (query: string) => {
    console.log('Map search:', query);
    // Handle map search - filter inspectors, search locations, etc.
  };

  return (
    <div className="h-screen w-full">
      <MapComponent
        inspectors={inspectors}
        onInspectorClick={handleInspectorClick}
        onSearch={handleSearch}
        loading={false}
      />
    </div>
  );
}