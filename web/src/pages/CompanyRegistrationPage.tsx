import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Mail, MapPin, Upload, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-toastify";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 14.5995,
  lng: 120.9842
};

export function CompanyRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    latitude: defaultCenter.lat,
    longitude: defaultCenter.lng,
    address: "",
  });
  const [businessPermitFile, setBusinessPermitFile] = useState<File | null>(null);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking wallet:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is required. Please install MetaMask browser extension.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);
      toast.success(`Wallet connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`);
    } catch (error: any) {
      if (error.code === 4001) {
        toast.warning("You rejected the wallet connection request.");
      } else {
        toast.error("Failed to connect wallet.");
      }
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error("Only PDF files are accepted for business permits");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setBusinessPermitFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      toast.error("Please connect your MetaMask wallet first");
      return;
    }

    if (!formData.companyName || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!businessPermitFile) {
      toast.error("Please upload your business permit");
      return;
    }

    setLoading(true);

    try {
      toast.info("Uploading business permit...");
      const permitUrl = await FirebaseStorageService.uploadBusinessPermit(
        formData.companyName,
        businessPermitFile
      );

      if (!permitUrl) {
        throw new Error("Failed to upload business permit");
      }

      toast.info("Registering company...");
      await CompanyOwnerService.register({
        ...formData,
        walletAddress,
        businessPermitUrl: permitUrl,
      });

      toast.success("Company registration submitted successfully! Awaiting admin approval.");
      navigate("/company/pending-approval");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/get-started")}
          className="mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Company Registration
              </h1>
              <p className="text-gray-600">
                Register your company to access the RCV platform
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  MetaMask Wallet Address *
                </label>
                {walletAddress ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={walletAddress}
                      disabled
                      className="font-mono text-sm bg-gray-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setWalletAddress("")}
                      className="cursor-pointer"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={connectWallet}
                    className="w-full cursor-pointer"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect MetaMask Wallet
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Owner's Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="owner@company.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Company Location *
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Click on the map to set your company's location
                </p>
                <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={markerPosition}
                    zoom={12}
                    onClick={handleMapClick}
                  >
                    <Marker position={markerPosition} />
                  </GoogleMap>
                </LoadScript>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    readOnly
                    placeholder="Latitude"
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    readOnly
                    placeholder="Longitude"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter street address"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Business Permit (PDF only) *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="business-permit"
                  />
                  <label
                    htmlFor="business-permit"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click to upload
                  </label>
                  {businessPermitFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {businessPermitFile.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    PDF files only, max 10MB
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/get-started")}
                  className="flex-1 cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Submit Registration"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
