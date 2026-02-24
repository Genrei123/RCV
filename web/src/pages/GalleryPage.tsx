import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SanityService } from "@/services/sanityService";

export function GalleryPage() {
  const navigate = useNavigate();
  const [gallerySection, setGallerySection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for the full-screen expanded view
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
                <span className="text-[10px] app-text-primary leading-tight">Regulatory Compliance Verification</span>
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
            {(Array.isArray(gallerySection) ? gallerySection : [gallerySection]).map((item: any) => {
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
                  {/* Hover Pop-up Content */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col-reverse p-4">
                    <div className="translate-y-[12px] group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex justify-between items-center">
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-gray-900">
                          <span className="truncate max-w-[120px]">{item.title}</span>
                          <ArrowRight size={14} className="shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Full Screen Modal (Pinterest Style) */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          onClick={() => setSelectedItem(null)} // Close on background click
        >
          {/* Close Button */}
          <button className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors">
            <X size={32} />
          </button>

          {/* Modal Card */}
          <div 
            className="bg-white rounded-3xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Left Side: Image */}
            <div className="w-full md:w-3/5 bg-gray-100 flex items-center justify-center overflow-hidden">
              <img 
                src={selectedItem.image.asset.url} 
                alt={selectedItem.title}
                className="w-full h-full object-contain"
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