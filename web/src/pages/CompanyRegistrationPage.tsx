import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Mail, MapPin, Upload, Wallet, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import "react-toastify/dist/ReactToastify.css";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    if (!formData.companyName || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
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
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        walletAddress,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 py-12 px-4">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <Button
        variant="ghost"
        onClick={() => navigate("/get-started")}
        className="absolute top-4 left-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block p-6 bg-white rounded-2xl shadow-lg mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Company Registration
          </h1>
          <p className="text-xl text-gray-600">
            Register your company to access the RCV platform
          </p>
        </div>

        <Card className="p-8 shadow-2xl bg-white">

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
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Minimum 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 cursor-pointer"
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
        </Card>
      </div>
    </div>
  );
}
