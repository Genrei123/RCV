import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SanityService } from "@/services/sanityService";

export function GalleryPage() {
  const navigate = useNavigate();
  const [gallerySection, setGallerySection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          <h1 className="text-4xl md:text-5xl font-bold app-text-primary mb-4">
            {"Gallery"}
          </h1>
          <p className="text-lg max-w-2xl mx-auto">
            {"Browse our latest updates and visual resources."}
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
                  className="relative group break-inside-avoid overflow-hidden rounded-2xl cursor-zoom-in shadow-sm hover:shadow-xl transition-shadow duration-300"
                >
                  <img
                    src={imageUrl}
                    alt={item.title || "Gallery Image"}
                    className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col-reverse justify-between p-4">
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
    </div>
  );
}