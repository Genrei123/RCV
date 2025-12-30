import { useState, useEffect, useRef } from 'react';
import { X, Building2, MapPin, FileText, Package, Download, Phone, Mail, Globe, Calendar, ExternalLink, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Company } from '@/typeorm/entities/company.entity';
import { PDFGenerationService } from '@/services/pdfGenerationService';
import { toast } from 'react-toastify';

declare global {
  interface Window {
    google: any;
  }
}

interface CompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

export function CompanyDetailsModal({ isOpen, onClose, company }: CompanyDetailsModalProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Load Google Maps
  useEffect(() => {
    if (!isOpen || !company?.latitude || !company?.longitude) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, [isOpen, company?.latitude, company?.longitude]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !company?.latitude || !company?.longitude) return;
    if (mapRef.current) return;

    const center = { lat: Number(company.latitude), lng: Number(company.longitude) };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
      ],
    });

    new window.google.maps.Marker({
      position: center,
      map,
      title: company.name,
    });

    mapRef.current = map;
  }, [mapLoaded, company?.latitude, company?.longitude, company?.name]);

  // Reset map when modal closes
  useEffect(() => {
    if (!isOpen) {
      mapRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen || !company) return null;

  const handleDownloadCertificate = async () => {
    if (!company || isDownloading) return;
    
    setIsDownloading(true);
    try {
      toast.info('Generating certificate PDF...', { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadCompanyCertificate(company);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const openInGoogleMaps = () => {
    if (company.latitude && company.longitude) {
      window.open(
        `https://www.google.com/maps?q=${company.latitude},${company.longitude}`,
        '_blank'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Building2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
              <p className="text-sm text-gray-500">View complete company information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-500">Company Name</label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium text-lg">{company.name}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">License Number</label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
                      {company.licenseNumber}
                    </span>
                  </div>
                </div>

                {company.businessType && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Business Type</label>
                    <p className="text-gray-900">{company.businessType}</p>
                  </div>
                )}

                {company.registrationDate && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Registration Date</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(company.registrationDate)}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Company ID</label>
                  <p className="text-gray-700 text-sm font-mono">{company._id}</p>
                </div>

                {company.description && (
                  <div className="space-y-1 col-span-2">
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900">{company.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            {(company.phone || company.email || company.website) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {company.phone && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline">
                          {company.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {company.email && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                          {company.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {company.website && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Website</label>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Location</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Registered Address</label>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <p className="text-gray-900">{company.address}</p>
                  </div>
                </div>

                {/* Map Display */}
                {company.latitude && company.longitude && (
                  <>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      {mapError ? (
                        <div className="h-[200px] flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                          <Map className="h-8 w-8 mb-2 text-gray-300" />
                          <p className="text-sm">Map could not be loaded</p>
                        </div>
                      ) : !mapLoaded ? (
                        <div className="h-[200px] flex items-center justify-center bg-gray-100">
                          <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full" />
                        </div>
                      ) : (
                        <div ref={mapContainerRef} className="h-[200px] w-full" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Coordinates: {Number(company.latitude).toFixed(6)}, {Number(company.longitude).toFixed(6)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openInGoogleMaps}
                        className="text-blue-600"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Google Maps
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Documents Section */}
            {company.documents && company.documents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Documents</h3>
                <div className="space-y-2">
                  {company.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Download className="h-4 w-4" />
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Registered Products</h3>
              <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {company.productCount ?? company.products?.length ?? 0} Product{(company.productCount ?? company.products?.length ?? 0) === 1 ? '' : 's'} Registered
                  </p>
                  {(company.productCount ?? company.products?.length ?? 0) > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      This company has registered products in the system
                    </p>
                  )}
                </div>
              </div>

              {/* Products List */}
              {company.products && company.products.length > 0 && (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-gray-500">Product List</label>
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {company.products.map((product, index) => (
                      <div key={product._id || index} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {product.LTONumber || 'N/A'}
                              </p>
                              {product.CFPRNumber && (
                                <p className="text-xs text-gray-500">
                                  CFPR: {product.CFPRNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Certificate Download Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Certificate</h3>
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-teal-900 mb-1">
                      Company Registration Certificate
                    </p>
                    <p className="text-xs text-teal-700">
                      Download an official certificate with QR code for verification
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadCertificate}
                    disabled={isDownloading}
                    className="bg-teal-600 hover:bg-teal-700 shrink-0 disabled:opacity-50"
                    size="sm"
                  >
                    <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-pulse' : ''}`} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
