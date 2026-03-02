import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";

export type MapSearchSuggestion = {
  id: string;
  name: string;
  role?: string;
  status?: "active" | "inactive";
  lastSeen?: string;
  badgeId?: string;
  location?: { lat: number; lng: number; address: string; city: string };
};

interface MapSearchContextType {
  mapSearchQuery: string;
  setMapSearchQuery: (query: string) => void;
  mapSearchSuggestions: MapSearchSuggestion[];
  setMapSearchSuggestions: (suggestions: MapSearchSuggestion[]) => void;
  onMapSuggestionClick: (suggestion: MapSearchSuggestion) => void;
  setOnMapSuggestionClick: (callback: (suggestion: MapSearchSuggestion) => void) => void;
}

const MapSearchContext = createContext<MapSearchContextType | undefined>(undefined);

export const MapSearchProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchSuggestions, setMapSearchSuggestions] = useState<
    MapSearchSuggestion[]
  >([]);

  // Use a ref to store the callback — avoids triggering re-renders and infinite loops
  const onMapSuggestionClickRef = useRef<(suggestion: MapSearchSuggestion) => void>(() => {});

  // Stable setter that never changes identity (no infinite loops from useEffect deps)
  const setOnMapSuggestionClick = useCallback((callback: (suggestion: MapSearchSuggestion) => void) => {
    onMapSuggestionClickRef.current = callback;
  }, []);

  // Stable dispatcher that always calls the latest registered callback
  const onMapSuggestionClick = useCallback((suggestion: MapSearchSuggestion) => {
    onMapSuggestionClickRef.current(suggestion);
  }, []);

  return (
    <MapSearchContext.Provider
      value={{
        mapSearchQuery,
        setMapSearchQuery,
        mapSearchSuggestions,
        setMapSearchSuggestions,
        onMapSuggestionClick,
        setOnMapSuggestionClick,
      }}
    >
      {children}
    </MapSearchContext.Provider>
  );
};

export const useMapSearch = () => {
  const context = useContext(MapSearchContext);
  if (!context) {
    throw new Error("useMapSearch must be used within MapSearchProvider");
  }
  return context;
};
