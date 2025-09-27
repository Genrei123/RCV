import { useState } from "react"
import { Search, MapPin, User, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface Inspector {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
}

interface MapComponentProps {
  inspectors?: Inspector[];
  onInspectorClick?: (inspector: Inspector) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  selectedInspector?: Inspector | null;
}

export function MapComponent({ 
  inspectors = [], 
  onInspectorClick, 
  onSearch,
  loading = false,
  selectedInspector 
}: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPin, setSelectedPin] = useState<Inspector | null>(selectedInspector || null)

  // Default sample data - Updated to match mockup exactly
  const defaultInspectors: Inspector[] = [
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

  const inspectorData = inspectors.length > 0 ? inspectors : defaultInspectors;

  // Filter inspectors based on search
  const filteredInspectors = inspectorData.filter(inspector =>
    inspector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspector.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspector.location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handlePinClick = (inspector: Inspector) => {
    setSelectedPin(inspector);
    onInspectorClick?.(inspector);
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* Full-Screen Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Map Background with Street Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%23d1d5db' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`
          }}
        ></div>
        
        {/* Manila Street Overlay */}
        <div className="absolute inset-0 opacity-30">
          {/* Major Streets */}
          <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gray-400 transform rotate-12"></div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-400 transform -rotate-6"></div>
          <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gray-400 transform rotate-3"></div>
          <div className="absolute left-1/4 top-0 bottom-0 w-0.5 bg-gray-400 transform rotate-12"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 transform -rotate-3"></div>
          <div className="absolute left-3/4 top-0 bottom-0 w-0.5 bg-gray-400 transform rotate-6"></div>
        </div>

        {/* Location Pins */}
        {filteredInspectors.map((inspector, index) => {
          // Position pins based on the mockup layout
          const positions = [
            { top: '20%', left: '30%' }, // Gizelle Fungo
            { top: '15%', left: '65%' }, // Winter Cruz  
            { top: '50%', left: '75%' }, // Karina Data Crud
            { top: '10%', left: '50%' }, // Nitinging Torres
            { top: '65%', left: '40%' }, // John Doe
            { top: '75%', left: '60%' }  // Lorem Chon
          ];
          const position = positions[index] || { top: '50%', left: '50%' };

          return (
            <div
              key={inspector.id}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-10 group"
              style={{ top: position.top, left: position.left }}
              onClick={() => handlePinClick(inspector)}
            >
              {/* Location Pin */}
              <div className="relative">
                <MapPin 
                  className={`h-8 w-8 transition-all duration-200 ${
                    selectedPin?.id === inspector.id
                      ? 'text-teal-600 scale-125'
                      : inspector.status === 'active' 
                        ? 'text-blue-600 hover:scale-110' 
                        : 'text-red-500 hover:scale-110'
                  }`}
                  fill="currentColor"
                />
                
                {/* Inspector Name Label */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {inspector.name}
                </div>
              </div>
            </div>
          );
        })}

        {/* Search Results Overlay */}
        {searchQuery && filteredInspectors.length === 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No inspectors found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search query</p>
            </div>
          </div>
        )}
      </div>

      {/* Left Sidebar - Floating Over Map */}
      <div className="absolute top-0 left-0 w-72 h-full bg-gray-50/95 backdrop-blur-sm border-r border-gray-200 flex flex-col z-20">
        
        {/* Search Section - Reduced margin */}
        <div className="m-3 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search City"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 text-sm h-10 rounded-md bg-white/90 backdrop-blur-sm border-gray-300"
            />
          </div>
        </div>

        {/* Food Inspectors Section - Expanded to take more space */}
        <div className="bg-white/90 backdrop-blur-sm mx-3 mb-3 rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Food Inspectors</h3>
            <p className="text-xs text-gray-500 mt-1">{filteredInspectors.length} inspectors</p>
          </div>

          {/* Inspector List */}
          <div className="flex-1 overflow-y-auto">
            {filteredInspectors.map((inspector) => (
              <div
                key={inspector.id}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${
                  selectedPin?.id === inspector.id ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      inspector.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{inspector.name}</p>
                      <p className="text-xs text-gray-500">{inspector.location.city}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs px-3 py-1 h-7 text-blue-600 border-blue-200 hover:bg-blue-50/80"
                    onClick={() => handlePinClick(inspector)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}