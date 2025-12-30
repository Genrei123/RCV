import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Upload,
  Trash2,
  Calendar,
  Loader2,
  Search,
  Map,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyService, type CreateCompanyRequest } from "@/services/companyService";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { MetaMaskService } from "@/services/metaMaskService";
import type { CompanyDocument } from "@/typeorm/entities/company.entity";
import { toast } from "react-toastify";
import { useMetaMask } from "@/contexts/MetaMaskContext";

// Declare google maps types
declare global {
  interface Window {
    google: any;
    initGoogleMapsCallback?: () => void;
  }
}

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PendingDocument {
  file: File;
  name: string;
  type: string;
  preview?: string;
}

const BUSINESS_TYPES = [
  "Manufacturer",
  "Distributor",
  "Retailer",
  "Wholesaler",
  "Importer",
  "Exporter",
  "Service Provider",
  "Healthcare Provider",
  "Pharmaceutical",
  "Food & Beverage",
  "Other",
];

const DOCUMENT_TYPES = [
  { value: "business-permit", label: "Business Permit" },
  { value: "license", label: "License" },
  { value: "certificate", label: "Certificate" },
  { value: "registration", label: "Registration Document" },
  { value: "tax-document", label: "Tax Document" },
  { value: "insurance", label: "Insurance Document" },
  { value: "other", label: "Other Document" },
];

export function AddCompanyModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // MetaMask context
  const { isConnected: isWalletConnected, isAuthorized: isWalletAuthorized, walletAddress, connect: connectWallet } = useMetaMask();

  // Form data
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    name: "",
    address: "",
    licenseNumber: "",
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    website: null,
    businessType: null,
    registrationDate: null,
    documents: null,
    description: null,
  });

  // Pending documents (files to upload)
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("business-permit");

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load Google Maps
  useEffect(() => {
    if (!isOpen) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // Create callback
    window.initGoogleMapsCallback = () => {
      setMapLoaded(true);
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);

    return () => {
      delete window.initGoogleMapsCallback;
    };
  }, [isOpen]);

  // Initialize map when loaded
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapRef.current) return;

    // Default to Philippines (Manila)
    const defaultCenter = { lat: 14.5995, lng: 120.9842 };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
      ],
    });

    mapRef.current = map;

    // Add click listener to place marker
    map.addListener("click", (e: any) => {
      placeMarker(e.latLng);
    });

    // Initialize autocomplete
    if (searchInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          types: ["geocode", "establishment"],
          fields: ["formatted_address", "geometry", "name"],
        }
      );

      autocomplete.bindTo("bounds", map);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) {
          toast.error("No location found for this place");
          return;
        }

        map.setCenter(place.geometry.location);
        map.setZoom(17);
        placeMarker(place.geometry.location);

        // Update address with place name or formatted address
        setFormData((prev) => ({
          ...prev,
          address: place.formatted_address || place.name || prev.address,
        }));
      });

      autocompleteRef.current = autocomplete;
    }
  }, [mapLoaded]);

  // Reset map when modal closes
  useEffect(() => {
    if (!isOpen) {
      mapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
    }
  }, [isOpen]);

  const placeMarker = useCallback((location: any) => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Create new marker
    const marker = new window.google.maps.Marker({
      position: location,
      map: mapRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    // Update coordinates on drag
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      setFormData((prev) => ({
        ...prev,
        latitude: pos.lat(),
        longitude: pos.lng(),
      }));

      // Reverse geocode to get address
      reverseGeocode(pos);
    });

    markerRef.current = marker;

    // Update form data
    setFormData((prev) => ({
      ...prev,
      latitude: location.lat(),
      longitude: location.lng(),
    }));

    // Reverse geocode to get address
    reverseGeocode(location);
  }, []);

  const reverseGeocode = useCallback((location: any) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        setFormData((prev) => ({
          ...prev,
          address: results[0].formatted_address,
        }));
      }
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value || null }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF, images, or documents.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Create preview for images
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = await FirebaseStorageService.fileToDataUrl(file);
    }

    const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === selectedDocumentType)?.label || "Document";
    
    setPendingDocuments((prev) => [
      ...prev,
      {
        file,
        name: `${docTypeLabel} - ${file.name}`,
        type: selectedDocumentType,
        preview,
      },
    ]);

    // Reset file input
    e.target.value = "";
  };

  const removePendingDocument = (index: number) => {
    setPendingDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Company name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Company name must be at least 2 characters";
    }

    if (!formData.address?.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    }

    if (!formData.licenseNumber?.trim()) {
      newErrors.licenseNumber = "License number is required";
    } else if (formData.licenseNumber.trim().length < 2) {
      newErrors.licenseNumber = "License number must be at least 2 characters";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Website must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setLoading(true);

    try {
      // ============ PHASE 1: BLOCKCHAIN VERIFICATION (Optional) ============
      let sepoliaTransactionId: string | undefined;
      
      if (isWalletConnected && isWalletAuthorized && walletAddress) {
        toast.info("Preparing blockchain verification...", { autoClose: 2000 });
        
        // Generate a hash from company data
        const companyDataString = JSON.stringify({
          name: formData.name,
          licenseNumber: formData.licenseNumber,
          address: formData.address,
          timestamp: new Date().toISOString()
        });
        
        // Create SHA-256 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(companyDataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const pdfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        toast.info("Storing certificate on Sepolia blockchain...", { autoClose: 2000 });
        
        const blockchainResult = await MetaMaskService.storeHashOnBlockchain(
          pdfHash,
          `CERT-COMP-${formData.licenseNumber}-${Date.now()}`,
          'company',
          formData.name!,
          walletAddress
        );
        
        if (blockchainResult.success && blockchainResult.data) {
          sepoliaTransactionId = blockchainResult.data.txHash;
          toast.success(
            `Blockchain verified! Tx: ${sepoliaTransactionId.slice(0, 10)}...`,
            { autoClose: 3000 }
          );
        } else {
          // Blockchain failed - ask user if they want to continue without it
          const continueWithoutBlockchain = window.confirm(
            "Blockchain storage failed. Do you want to create the company without blockchain verification?\n\n" +
            "Note: The company can be verified on blockchain later."
          );
          
          if (!continueWithoutBlockchain) {
            toast.info("Company creation cancelled");
            setLoading(false);
            return;
          }
        }
      }

      // ============ PHASE 2: UPLOAD DOCUMENTS ============
      let uploadedDocuments: CompanyDocument[] = [];
      
      if (pendingDocuments.length > 0) {
        setUploading(true);
        toast.info("Uploading documents...", { autoClose: 1500 });
        const tempId = `temp_${Date.now()}`;
        
        for (const doc of pendingDocuments) {
          try {
            const result = await FirebaseStorageService.uploadCompanyDocument(
              tempId,
              doc.file,
              doc.type
            );
            
            uploadedDocuments.push({
              name: doc.name,
              url: result.downloadUrl,
              type: result.fileType,
              uploadedAt: new Date().toISOString(),
            });
          } catch (error) {
            console.error("Error uploading document:", error);
            toast.error(`Failed to upload ${doc.name}`);
          }
        }
        setUploading(false);
      }

      // ============ PHASE 3: CREATE COMPANY ============
      const companyData: CreateCompanyRequest = {
        ...formData,
        name: formData.name!.trim(),
        address: formData.address!.trim(),
        licenseNumber: formData.licenseNumber!.trim(),
        documents: uploadedDocuments.length > 0 ? uploadedDocuments : null,
        sepoliaTransactionId,
      };

      const response = await CompanyService.createCompany(companyData);
      
      if (sepoliaTransactionId) {
        toast.success("Company created & verified on blockchain!");
      } else {
        toast.success(response.message || "Company created successfully!");
      }

      // Reset form
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating company:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create company. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      licenseNumber: "",
      latitude: null,
      longitude: null,
      phone: null,
      email: null,
      website: null,
      businessType: null,
      registrationDate: null,
      documents: null,
      description: null,
    });
    setPendingDocuments([]);
    setErrors({});
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  };

  const handleClose = () => {
    if (!loading && !uploading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Company</h2>
              <p className="text-sm text-gray-500">
                Register a new company with documents and location
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading || uploading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* MetaMask Connection Warning */}
            {(!isWalletConnected || !isWalletAuthorized) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">
                      {!isWalletConnected 
                        ? "MetaMask Not Connected" 
                        : "Wallet Not Authorized"}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {!isWalletConnected 
                        ? "You need to connect your MetaMask wallet to add companies. The company certificate will be stored on the Sepolia blockchain for verification."
                        : "Your wallet is connected but not authorized. Please contact an administrator to authorize your wallet address."}
                    </p>
                    {!isWalletConnected && (
                      <Button
                        type="button"
                        onClick={() => connectWallet()}
                        className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                        size="sm"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect MetaMask
                      </Button>
                    )}
                    {isWalletConnected && !isWalletAuthorized && walletAddress && (
                      <p className="text-xs text-amber-600 mt-2 font-mono">
                        Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Connected Badge */}
            {isWalletConnected && isWalletAuthorized && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Wallet Connected & Authorized
                  </span>
                  <span className="text-xs text-green-600 font-mono ml-auto">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                </div>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* License Number */}
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">
                    License Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    value={formData.licenseNumber || ""}
                    onChange={handleChange}
                    placeholder="Enter license number"
                    className={errors.licenseNumber ? "border-red-500" : ""}
                  />
                  {errors.licenseNumber && (
                    <p className="text-xs text-red-500">{errors.licenseNumber}</p>
                  )}
                </div>

                {/* Business Type */}
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select
                    value={formData.businessType || ""}
                    onValueChange={(value) => handleSelectChange("businessType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Registration Date */}
                <div className="space-y-2">
                  <Label htmlFor="registrationDate">Registration Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="registrationDate"
                      name="registrationDate"
                      type="date"
                      value={formData.registrationDate || ""}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder="Enter company description (optional)"
                  rows={3}
                />
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-400" />
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleChange}
                      placeholder="+63 XXX XXX XXXX"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      placeholder="company@example.com"
                      className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      name="website"
                      value={formData.website || ""}
                      onChange={handleChange}
                      placeholder="https://www.example.com"
                      className={`pl-10 ${errors.website ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.website && (
                    <p className="text-xs text-red-500">{errors.website}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                Location
              </h3>

              {/* Address Input */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    name="address"
                    value={formData.address || ""}
                    onChange={handleChange}
                    placeholder="Enter company address"
                    className={`pl-10 ${errors.address ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.address && (
                  <p className="text-xs text-red-500">{errors.address}</p>
                )}
              </div>

              {/* Map Search */}
              <div className="space-y-2">
                <Label>Search Location on Map</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for a place..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Google Map */}
              <div className="rounded-lg overflow-hidden border border-gray-200">
                {mapError ? (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                    <Map className="h-12 w-12 mb-2 text-gray-300" />
                    <p className="text-sm">Google Maps could not be loaded</p>
                    <p className="text-xs text-gray-400">Please check your API key configuration</p>
                  </div>
                ) : !mapLoaded ? (
                  <div className="h-[300px] flex items-center justify-center bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div ref={mapContainerRef} className="h-[300px] w-full" />
                )}
              </div>

              {/* Coordinates Display */}
              {formData.latitude && formData.longitude && (
                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg text-sm">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">
                    Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Click on the map to place a marker or search for a location. You can drag the marker to adjust the position.
              </p>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Documents
              </h3>

              {/* Document Type Selection and Upload */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Document Type</Label>
                  <Select
                    value={selectedDocumentType}
                    onValueChange={setSelectedDocumentType}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileSelect}
                    />
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </div>
                  </label>
                </div>
              </div>

              {/* Pending Documents List */}
              {pendingDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label>Documents to Upload</Label>
                  <div className="space-y-2">
                    {pendingDocuments.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {doc.preview ? (
                            <img
                              src={doc.preview}
                              alt={doc.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePendingDocument(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Accepted file types: PDF, JPG, PNG, DOC, DOCX. Maximum file size: 10MB per document.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading || uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || uploading || !isWalletConnected || !isWalletAuthorized}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isWalletConnected ? "Connect MetaMask to create companies" : !isWalletAuthorized ? "Wallet not authorized" : ""}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading Documents...
              </>
            ) : loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Company...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Create Company
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
