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

  // Default sample data
  const defaultInspectors: Inspector[] = [
    {
      id: "1",
      name: "Gizelle Fungo",
      role: "Inspector",
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
      role: "Inspector",
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
      role: "Inspector", 
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
      role: "Inspector",
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
      role: "Inspector",
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
      role: "Inspector",
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
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search locations, inspectors..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 h-[600px]">
        {/* Inspector List Sidebar */}
        <Card className="lg:col-span-1 h-full">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800 text-sm">
                {filteredInspectors.length > 0 ? `${filteredInspectors.length} Inspectors` : 'No inspectors found'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredInspectors.map((inspector) => (
                <div
                  key={inspector.id}
                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedPin?.id === inspector.id 
                      ? 'bg-teal-50 border-l-4 border-l-teal-500' 
                      : ''
                  }`}
                  onClick={() => handlePinClick(inspector)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        inspector.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="font-medium text-sm text-gray-900">{inspector.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-60 hover:opacity-100">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{inspector.role}</p>
                  <p className="text-xs text-gray-500">{inspector.location.city}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Map Area */}
        <Card className="lg:col-span-4 h-full">
          <CardContent className="p-0 h-full">
            <div className="relative h-full bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg overflow-hidden">
              {/* Simulated Map Background with Street Pattern */}
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`
                }}
              ></div>
              
              {/* Manila Street Overlay */}
              <div className="absolute inset-0 opacity-20">
                {/* Major Streets */}
                <div className="absolute top-1/4 left-0 right-0 h-1 bg-gray-400 transform rotate-12"></div>
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-400 transform -rotate-6"></div>
                <div className="absolute top-3/4 left-0 right-0 h-1 bg-gray-400 transform rotate-3"></div>
                <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-gray-400 transform rotate-12"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-400 transform -rotate-3"></div>
                <div className="absolute left-3/4 top-0 bottom-0 w-1 bg-gray-400 transform rotate-6"></div>
                
                {/* Manila Bay Area */}
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-teal-200 opacity-30 rounded-tl-full"></div>
                
                {/* City Districts */}
                <div className="absolute top-1/4 right-1/4 w-16 h-12 bg-green-200 opacity-40 rounded"></div>
                <div className="absolute bottom-1/3 left-1/3 w-20 h-16 bg-yellow-200 opacity-40 rounded"></div>
              </div>

              {/* Map Pins */}
              {filteredInspectors.map((inspector, index) => {
                // Calculate relative positions for demo (in real app, use actual coordinates)
                const positions = [
                  { top: '35%', left: '45%' }, // Makati - Central business area
                  { top: '25%', left: '65%' }, // Ortigas - Northeast
                  { top: '55%', left: '70%' }, // BGC - Southeast
                  { top: '20%', left: '50%' }, // QC - North
                  { top: '65%', left: '45%' }, // Manila - South central
                  { top: '75%', left: '40%' }  // Malate - Southwest
                ];
                const position = positions[index] || { top: '50%', left: '50%' };

                return (
                  <div
                    key={inspector.id}
                    className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-20 group"
                    style={{ top: position.top, left: position.left }}
                    onClick={() => handlePinClick(inspector)}
                  >
                    <div className="relative">
                      {/* Pin Shadow */}
                      <div className="absolute -bottom-1 left-1/2 w-3 h-1 bg-black opacity-20 rounded-full transform -translate-x-1/2 blur-sm"></div>
                      
                      {/* Main Pin */}
                      <MapPin 
                        className={`h-10 w-10 transition-all duration-300 drop-shadow-lg ${
                          selectedPin?.id === inspector.id
                            ? 'text-teal-600 scale-125 animate-bounce'
                            : inspector.status === 'active' 
                              ? 'text-green-600 hover:scale-110 hover:drop-shadow-xl' 
                              : 'text-red-500 hover:scale-110 hover:drop-shadow-xl'
                        }`}
                        fill="currentColor"
                      />
                      
                      {/* Pin Pulse Effect for Active */}
                      {inspector.status === 'active' && (
                        <div className="absolute top-2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 animate-pulse"></div>
                      )}
                      
                      {/* Hover Tooltip */}
                      <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border p-3 min-w-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                        <p className="font-medium text-sm text-gray-900">{inspector.name}</p>
                        <p className="text-xs text-gray-600">{inspector.role}</p>
                        <p className="text-xs text-gray-500">{inspector.location.address}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            inspector.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs font-medium capitalize">{inspector.status}</span>
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-white border-r border-b transform rotate-45 -translate-x-1/2"></div>
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
                    <h3 className="font-medium text-gray-900 mb-1">No locations found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your search query</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Inspector Details Panel */}
      {selectedPin && (
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPin.name}</h3>
                  <p className="text-sm text-gray-600 font-medium">{selectedPin.role}</p>
                  <p className="text-sm text-gray-500">{selectedPin.location.address}, {selectedPin.location.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedPin.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <Badge 
                    variant={selectedPin.status === 'active' ? 'default' : 'destructive'}
                    className="font-medium"
                  >
                    {selectedPin.status}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="font-medium">
                  View Profile
                </Button>
                <Button size="sm" className="font-medium">
                  Contact
                </Button>
              </div>
            </div>
            
            {/* Additional Details */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-teal-600">24</p>
                <p className="text-xs text-gray-600">Inspections Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">98%</p>
                <p className="text-xs text-gray-600">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">4.8</p>
                <p className="text-xs text-gray-600">Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}