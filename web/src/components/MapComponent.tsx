// Google Maps Component - See GOOGLE_MAPS_SETUP.md for configuration
import { useState, useEffect, useRef } from "react"
import { Search, MapPin, User, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface Inspector {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  location: { lat: number; lng: number; address: string; city: string; };
}

interface MapComponentProps {
  inspectors?: Inspector[];
  onInspectorClick?: (inspector: Inspector) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
}

declare global {
  interface Window { google: any; }
}

export function MapComponent({ inspectors = [], onInspectorClick, onSearch, loading = false }: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(null)
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>(inspectors)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInspectors(inspectors)
    } else {
      const filtered = inspectors.filter(inspector =>
        inspector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspector.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspector.location.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredInspectors(filtered)
    }
  }, [searchQuery, inspectors])

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setMapError(true); return }
    if (window.google?.maps) { setMapLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () => setMapError(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return
    const center = inspectors.length > 0 
      ? { lat: inspectors.reduce((s, i) => s + i.location.lat, 0) / inspectors.length,
          lng: inspectors.reduce((s, i) => s + i.location.lng, 0) / inspectors.length }
      : { lat: 14.5995, lng: 120.9842 }
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center, zoom: 12, mapTypeControl: true, streetViewControl: true,
      fullscreenControl: true, zoomControl: true
    })
    infoWindowRef.current = new window.google.maps.InfoWindow()
  }, [mapLoaded, inspectors])

  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    filteredInspectors.forEach((inspector) => {
      const marker = new window.google.maps.Marker({
        position: { lat: inspector.location.lat, lng: inspector.location.lng },
        map: googleMapRef.current, title: inspector.name,
        icon: { path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: inspector.status === 'active' ? '#10b981' : '#ef4444',
          fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 10 }
      })
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`<div style="padding:12px"><h3>${inspector.name}</h3><p>${inspector.role}</p><p>${inspector.location.city}</p></div>`)
        infoWindowRef.current.open(googleMapRef.current, marker)
        setSelectedInspector(inspector)
        onInspectorClick?.(inspector)
      })
      markersRef.current.push(marker)
    })
    if (filteredInspectors.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      filteredInspectors.forEach(i => bounds.extend({ lat: i.location.lat, lng: i.location.lng }))
      googleMapRef.current.fitBounds(bounds)
    }
  }, [filteredInspectors, mapLoaded, onInspectorClick])

  if (loading) return <div className="w-full h-full flex items-center justify-center"><div className="animate-spin h-12 w-12 border-b-2 border-teal-600"></div></div>
  if (mapError) return <div className="w-full h-full flex items-center justify-center"><Card className="p-8"><p className="text-red-600">Map unavailable. Check GOOGLE_MAPS_SETUP.md</p></Card></div>

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-10 w-96">
        <Card className="shadow-lg p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search inspectors..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value) }}
              className="pl-10 pr-10" />
            {searchQuery && <button onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4" /></button>}
          </div>
          {searchQuery && filteredInspectors.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto border-t pt-2">
              {filteredInspectors.map(i => (
                <button key={i.id} onClick={() => setSelectedInspector(i)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded">
                  <span className="font-medium text-sm">{i.name}</span>
                  <p className="text-xs text-gray-600">{i.location.city}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
      {selectedInspector && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-2xl mx-auto">
          <Card className="shadow-xl border-l-4 border-l-teal-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-teal-600" />
                <div>
                  <h3 className="font-semibold">{selectedInspector.name}</h3>
                  <p className="text-sm text-gray-600">{selectedInspector.location.address}</p>
                </div>
              </div>
              <Badge>{selectedInspector.status}</Badge>
            </div>
          </Card>
        </div>
      )}
      <div className="absolute top-4 right-4 z-10">
        <Card className="shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-semibold">{filteredInspectors.length} Inspectors</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
