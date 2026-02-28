import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X, ZoomIn, ZoomOut, RotateCcw, Maximize2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SanityService } from "@/services/sanityService";

export function GalleryPage() {
  const navigate = useNavigate();
  const [gallerySection, setGallerySection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Zoom panel toggle
  const [zoomPanelOpen, setZoomPanelOpen] = useState(false);

  // Pinch-to-zoom state
  const lastPinchDistance = useRef<number | null>(null);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.5;

  // Reset zoom/pan when modal opens/closes
  useEffect(() => {
    if (selectedItem) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setZoomPanelOpen(false);
    }
  }, [selectedItem]);

  const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Clamp pan so image doesn't drift too far off screen
  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number) => {
      if (currentZoom <= 1) return { x: 0, y: 0 };
      const maxX = (imageRef.current?.clientWidth ?? 400) * (currentZoom - 1) / 2;
      const maxY = (imageRef.current?.clientHeight ?? 400) * (currentZoom - 1) / 2;
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    []
  );

  // ── Scroll wheel zoom ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setZoom((prev) => {
        const next = clampZoom(prev + delta * prev);
        setPan((p) => clampPan(p.x, p.y, next));
        return next;
      });
    },
    [clampPan]
  );

  // ── Mouse drag ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan(clampPan(dragStart.current.panX + dx, dragStart.current.panY + dy, zoom));
    },
    [isDragging, zoom, clampPan]
  );

  const handleMouseUp = () => setIsDragging(false);

  // ── Touch pinch & drag ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistance.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setIsDragging(true);
    }
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastPinchDistance.current !== null) {
          const ratio = dist / lastPinchDistance.current;
          setZoom((prev) => {
            const next = clampZoom(prev * ratio);
            setPan((p) => clampPan(p.x, p.y, next));
            return next;
          });
        }
        lastPinchDistance.current = dist;
      } else if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setPan(clampPan(dragStart.current.panX + dx, dragStart.current.panY + dy, zoom));
      }
    },
    [isDragging, zoom, clampPan]
  );

  const handleTouchEnd = () => {
    lastPinchDistance.current = null;
    setIsDragging(false);
  };

  // ── Double-click to toggle 2× zoom ──
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetView();
    } else {
      setZoom(2);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await SanityService.getGallerySection();
        setGallerySection(response);
      } catch (error) {
        console.error("Error fetching gallery section:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img src="/logo_inv.svg" alt="Logo" className="h-10 w-10" />
              <div className="flex flex-col">
                <span className="font-bold text-lg app-text-primary leading-tight">RCV</span>
                <span className="text-[10px] app-text-primary leading-tight">
                  Regulatory Compliance Verification
                </span>
              </div>
            </div>
            <Button onClick={() => navigate("/")} variant="ghost">
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold app-text-primary mb-4">Gallery</h1>
          <p className="text-lg max-w-2xl mx-auto text-gray-500">
            Browse our latest updates and visual resources.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-gray-400">Loading inspiration...</div>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {(Array.isArray(gallerySection) ? gallerySection : [gallerySection]).map(
              (item: any) => {
                const imageUrl = item?.image?.asset?.url;
                if (!imageUrl) return null;

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedItem(item)}
                    className="relative group break-inside-avoid overflow-hidden rounded-2xl cursor-zoom-in shadow-sm hover:shadow-xl transition-shadow duration-300"
                  >
                    <img
                      src={imageUrl}
                      alt={item.title || "Gallery Image"}
                      className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col-reverse p-4">
                      <div className="translate-y-[12px] group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex justify-between items-center">
                          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-gray-900">
                            <span className="truncate max-w-[120px]">{item.title}</span>
                            <ArrowRight size={14} className="shrink-0" />
                          </div>
                          <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full">
                            <Maximize2 size={14} className="text-gray-800" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </main>

      {/* ── Full Screen Modal with Zoom ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          onClick={() => setSelectedItem(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10"
            onClick={() => setSelectedItem(null)}
          >
            <X size={32} />
          </button>

          {/* Bottom-right zoom icon + popover */}
          <div
            className="absolute bottom-6 right-6 z-10 flex flex-col items-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover panel — slides up when open */}
            <div
              className={`flex flex-col items-center gap-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-3 shadow-xl transition-all duration-200 ${
                zoomPanelOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <button
                onClick={() =>
                  setZoom((prev) => {
                    const next = clampZoom(prev + ZOOM_STEP);
                    setPan((p) => clampPan(p.x, p.y, next));
                    return next;
                  })
                }
                disabled={zoom >= MAX_ZOOM}
                className="text-white disabled:opacity-30 hover:text-gray-200 transition-colors p-1.5"
                title="Zoom in"
              >
                <ZoomIn size={18} />
              </button>

              <span className="text-white text-xs font-mono select-none w-10 text-center">
                {zoomPercent}%
              </span>

              <button
                onClick={() =>
                  setZoom((prev) => {
                    const next = clampZoom(prev - ZOOM_STEP);
                    setPan((p) => clampPan(p.x, p.y, next));
                    return next;
                  })
                }
                disabled={zoom <= MIN_ZOOM}
                className="text-white disabled:opacity-30 hover:text-gray-200 transition-colors p-1.5"
                title="Zoom out"
              >
                <ZoomOut size={18} />
              </button>

              <div className="w-5 h-px bg-white/30 my-0.5" />

              <button
                onClick={resetView}
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                className="text-white disabled:opacity-30 hover:text-gray-200 transition-colors p-1.5"
                title="Reset view"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Toggle icon button */}
            <button
              onClick={() => setZoomPanelOpen((o) => !o)}
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                zoomPanelOpen
                  ? "bg-white text-gray-900"
                  : "bg-white/15 backdrop-blur-md border border-white/25 text-white hover:bg-white/25"
              }`}
              title="Zoom controls"
            >
              <ScanSearch size={20} />
            </button>
          </div>

          {/* Modal Card */}
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Side: Zoomable Image */}
            <div
              ref={imageRef}
              className="w-full md:w-3/5 bg-gray-100 flex items-center justify-center overflow-hidden relative"
              style={{
                cursor:
                  zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                minHeight: "300px",
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={selectedItem.image.asset.url}
                alt={selectedItem.title}
                draggable={false}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  userSelect: "none",
                  pointerEvents: "none", // let parent handle events
                }}
              />
            </div>

            {/* Right Side: Description */}
            <div className="w-full md:w-2/5 p-8 flex flex-col h-full overflow-y-auto">
              <div className="mb-8">
                <h2 className="text-3xl font-bold app-text-primary mb-4">
                  {selectedItem.title}
                </h2>
                <div className="h-1 w-12 bg-primary mb-6 rounded-full" />
                <p className="text-gray-600 text-lg leading-relaxed">
                  {selectedItem.description || "No description provided for this entry."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}