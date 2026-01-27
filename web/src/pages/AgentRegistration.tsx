// =========================================================================
// AGENT REGISTRATION PAGE - Invited Agent Registration Flow
// =========================================================================
// This page handles the registration flow for agents invited by admins:
// 1. Verify invitation token
// 2. Verify badge number
// 3. Complete registration form with document uploads
// =========================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Upload,
  Camera,
  FileText,
  Loader2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  AdminInviteService,
  type InviteVerificationResponse,
} from "@/services/adminInviteService";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { validatePhilippinePhoneNumber } from "@/utils/phoneValidation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface PhilippineCity {
  name: string;
  adminName1: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

type RegistrationStep =
  | "verifying"
  | "badge_verification"
  | "registration"
  | "complete"
  | "error";

export function AgentRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  // Step state
  const [step, setStep] = useState<RegistrationStep>("verifying");
  const [inviteData, setInviteData] = useState<
    InviteVerificationResponse["invite"] | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Badge verification
  const [badgeInput, setBadgeInput] = useState("");
  const [verifiedBadgeId, setVerifiedBadgeId] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // Registration form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    extName: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    location: "",
    dateOfBirth: "",
  });

  // Document uploads
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [idDocumentPreview, setIdDocumentPreview] = useState("");
  const [selfieWithId, setSelfieWithId] = useState<File | null>(null);
  const [selfieWithIdPreview, setSelfieWithIdPreview] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cities
  const [philippineCities, setPhilippineCities] = useState<PhilippineCity[]>(
    []
  );
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");

  // Refs
  const idDocumentRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Verify token on mount
  useEffect(() => {
    if (!inviteToken) {
      setStep("error");
      setErrorMessage(
        "No invitation token provided. Please use the link from your invitation email."
      );
      return;
    }
    verifyToken();
  }, [inviteToken]);

  // Handle click outside city dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    };

    if (showCityDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCityDropdown]);

  // Fetch Philippine cities
  useEffect(() => {
    const fetchPhilippineCities = async () => {
      try {
        const [citiesResponse, municipalitiesResponse] = await Promise.all([
          fetch("https://psgc.gitlab.io/api/cities/"),
          fetch("https://psgc.gitlab.io/api/municipalities/"),
        ]);

        const citiesData = await citiesResponse.json();
        const municipalitiesData = await municipalitiesResponse.json();

        let allLocations: PhilippineCity[] = [];

        if (citiesData && Array.isArray(citiesData)) {
          allLocations = [
            ...allLocations,
            ...citiesData.map((city: any) => ({
              name: city.name || city.cityName,
              adminName1: city.province || city.regionName || "Philippines",
            })),
          ];
        }

        if (municipalitiesData && Array.isArray(municipalitiesData)) {
          allLocations = [
            ...allLocations,
            ...municipalitiesData.map((m: any) => ({
              name: m.name || m.municipalityName,
              adminName1: m.province || m.regionName || "Philippines",
            })),
          ];
        }

        allLocations.sort((a, b) => a.name.localeCompare(b.name));
        setPhilippineCities(allLocations);
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchPhilippineCities();
  }, []);

  const verifyToken = async () => {
    setLoading(true);
    try {
      const response = await AdminInviteService.verifyInviteToken(inviteToken!);

      if (response.success && response.invite) {
        setInviteData(response.invite);

        if (response.invite.requiresBadgeVerification) {
          setStep("badge_verification");
        } else if (response.invite.status === "badge_verified") {
          setVerifiedEmail(response.invite.email);
          setVerifiedBadgeId(response.invite.badgeId || "");
          setStep("registration");
        } else {
          setStep("error");
          setErrorMessage(
            "This invitation is in an unexpected state. Please contact the administrator."
          );
        }
      }
    } catch (error: any) {
      setStep("error");
      setErrorMessage(
        error.response?.data?.message ||
          "Invalid or expired invitation link. Please request a new invitation."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!badgeInput.trim()) {
      toast.error("Please enter your badge number");
      return;
    }

    setLoading(true);
    try {
      const response = await AdminInviteService.verifyBadgeNumber({
        token: inviteToken!,
        badgeId: badgeInput.trim().toUpperCase(),
      });

      if (response.success) {
        toast.success("Badge number verified!");
        setVerifiedBadgeId(response.invite.badgeId);
        setVerifiedEmail(response.invite.email);
        setStep("registration");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Badge verification failed");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    if (password.length >= 14) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Fair", color: "bg-yellow-500" };
    if (score <= 5) return { score, label: "Good", color: "bg-blue-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{14,}$/.test(formData.password)) {
      newErrors.password =
        "Password must be at least 14 characters with uppercase, lowercase, number, and may contain special characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPasswordRequired = "Confirm password is required";
    }
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPasswordMismatch = "Passwords do not match";
      newErrors.confirmPasswordRequired = "Confirm password is required";
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (formData.phoneNumber.length !== 10) {
      newErrors.phoneNumber = "Invalid phone number";
    } else {
      const phoneValidation = validatePhilippinePhoneNumber(
        `0${formData.phoneNumber}`
      );
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber = "Invalid phone number";
      }
    }

    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    else {
      // Check if user is at least 18 years old
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old to register";
      }
    }
    if (!idDocument) newErrors.idDocument = "ID document is required";
    if (!selfieWithId) newErrors.selfieWithId = "Selfie with ID is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "selfie"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "id") {
        setIdDocument(file);
        setIdDocumentPreview(reader.result as string);
        if (errors.idDocument) setErrors({ ...errors, idDocument: "" });
      } else {
        setSelfieWithId(file);
        setSelfieWithIdPreview(reader.result as string);
        if (errors.selfieWithId) setErrors({ ...errors, selfieWithId: "" });
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadDocument = async (file: File, path: string): Promise<string> => {
    const response =
      await FirebaseStorageService.uploadAgentVerificationDocument(file, path);
    return response.downloadUrl;
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setLoading(true);
    try {
      // Upload documents first
      const timestamp = Date.now();
      const idDocPath = `agent-verification/${inviteToken}/id-document-${timestamp}`;
      const selfiePath = `agent-verification/${inviteToken}/selfie-${timestamp}`;

      toast.info("Uploading documents...");

      const [idDocumentUrl, selfieWithIdUrl] = await Promise.all([
        uploadDocument(idDocument!, idDocPath),
        uploadDocument(selfieWithId!, selfiePath),
      ]);

      toast.info("Completing registration...");

      // Complete registration
      const response = await AdminInviteService.completeRegistration({
        token: inviteToken!,
        badgeId: verifiedBadgeId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        extName: formData.extName || undefined,
        password: formData.password,
        phoneNumber: `+63${formData.phoneNumber}`,
        location: formData.location,
        dateOfBirth: formData.dateOfBirth,
        idDocumentUrl,
        selfieWithIdUrl,
      });

      if (response.success) {
        setStep("complete");
        toast.success("Registration completed successfully!");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const filteredCities = philippineCities.filter((city) =>
    city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  // =========================================================================
  // RENDER - Verifying State
  // =========================================================================
  if (step === "verifying") {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Verifying Invitation</h2>
          <p className="text-gray-600">
            Please wait while we verify your invitation link...
          </p>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RENDER - Error State
  // =========================================================================
  if (step === "error") {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Invitation Error</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-green-600 hover:bg-green-700"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RENDER - Complete State
  // =========================================================================
  if (step === "complete") {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            Registration Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            Your registration has been submitted successfully. An administrator
            will review your application and documents. You will receive an
            email once your account is approved.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong>
              <br />
              An administrator will verify your ID documents and approve your
              account. This usually takes 1-2 business days.
            </p>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            Go to Login Page
          </Button>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RENDER - Badge Verification Step
  // =========================================================================
  if (step === "badge_verification") {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <ToastContainer position="top-right" autoClose={3000} />
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verify Your Identity</h2>
            <p className="text-gray-600">
              Enter the badge number provided by your administrator to continue
              with registration.
            </p>
          </div>

          {inviteData?.personalMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 italic">
                "{inviteData.personalMessage}"
              </p>
              <p className="text-xs text-blue-600 mt-2">
                — {inviteData.invitedByName || "Administrator"}
              </p>
            </div>
          )}

          <form onSubmit={handleBadgeVerification} className="space-y-4">
            <div>
              <Label htmlFor="badgeId">Badge Number</Label>
              <div className="relative mt-1">
                <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="badgeId"
                  type="text"
                  placeholder="e.g., AGT-2024-001"
                  className="pl-10 h-11 uppercase"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This was provided in your invitation email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-green-600 hover:bg-green-700"
              disabled={loading || !badgeInput.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Badge Number
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RENDER - Registration Form Step
  // =========================================================================
  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50 py-8 px-4">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Complete Your Registration
            </h2>
            <p className="text-gray-600">
              Fill in your details to complete your agent registration.
            </p>
          </div>

          {/* Pre-filled read-only fields */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Verified Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500 text-xs">Email Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{verifiedEmail}</span>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Badge ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <BadgeCheck className="w-4 h-4 text-gray-400" />
                  <code className="font-medium bg-white px-2 py-0.5 rounded border">
                    {verifiedBadgeId}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleRegistration} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    className={`mt-1 h-11 ${
                      errors.firstName ? "border-red-500" : ""
                    }`}
                    value={formData.firstName}
                    onChange={(e) => {
                      // Remove any numeric characters
                      const value = e.target.value.replace(/[0-9]/g, "");
                      setFormData({ ...formData, firstName: value });
                    }}
                    disabled={loading}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="middleName">
                    {" "}
                    Middle Name
                    <div className="app-text-muted"> (Optional)</div>
                  </Label>
                  <Input
                    id="middleName"
                    placeholder="M."
                    className="mt-1 h-11"
                    value={formData.middleName}
                    onChange={(e) =>
                      setFormData({ ...formData, middleName: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    className={`mt-1 h-11 ${
                      errors.lastName ? "border-red-500" : ""
                    }`}
                    value={formData.lastName}
                    onChange={(e) => {
                      // Remove any numeric characters
                      const value = e.target.value.replace(/[0-9]/g, "");
                      setFormData({ ...formData, lastName: value });
                    }}
                    disabled={loading}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="extName">
                    Extension Name
                    <div className="app-text-muted"> (Optional)</div>
                  </Label>
                  <Input
                    id="extName"
                    placeholder="Jr., Sr., III"
                    className="mt-1 h-11"
                    value={formData.extName}
                    onChange={(e) =>
                      setFormData({ ...formData, extName: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                      +63
                    </span>
                    <Input
                      id="phoneNumber"
                      placeholder="9991113333"
                      maxLength={10}
                      className={`pl-12 h-11 ${
                        errors.phoneNumber ? "border-red-500" : ""
                      }`}
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");

                        // If user typed +63 prefix, remove it (first 2 digits)
                        if (value.startsWith("63") && value.length > 10) {
                          value = value.substring(2);
                        }

                        // Take only first 10 digits
                        value = value.slice(0, 10);
                        setFormData({ ...formData, phoneNumber: value });
                        // Clear error when user starts typing
                        if (errors.phoneNumber) {
                          setErrors({ ...errors, phoneNumber: "" });
                        }
                      }}
                      onBlur={() => {
                        if (
                          formData.phoneNumber &&
                          formData.phoneNumber.length === 10
                        ) {
                          const phoneValidation = validatePhilippinePhoneNumber(
                            `0${formData.phoneNumber}`
                          );
                          if (!phoneValidation.isValid) {
                            setErrors({
                              ...errors,
                              phoneNumber: "Invalid phone number",
                            });
                          }
                        }
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      className={`pl-10 h-11 ${
                        errors.dateOfBirth ? "border-red-500" : ""
                      }`}
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="location">City/Municipality *</Label>
                  <div className="relative mt-1" ref={cityDropdownRef}>
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <div className="relative">
                      <Input
                        id="location"
                        placeholder="Search city or municipality..."
                        className={`pl-10 pr-8 h-11 ${
                          errors.location ? "border-red-500" : ""
                        }`}
                        value={citySearchTerm || formData.location}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCitySearchTerm(value);
                          if (value !== formData.location) {
                            setFormData({ ...formData, location: "" });
                          }
                          if (value) {
                            setShowCityDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Handle autocomplete/autosuggestion selection
                          const currentValue = citySearchTerm || formData.location;
                          if (currentValue) {
                            // Check if the current value matches a valid city
                            const matchedCity = philippineCities.find(
                              (city) => city.name.toLowerCase() === currentValue.toLowerCase()
                            );
                            if (matchedCity) {
                              setFormData({ ...formData, location: matchedCity.name });
                              setCitySearchTerm(matchedCity.name);
                              if (errors.location) {
                                setErrors({ ...errors, location: "" });
                              }
                            }
                          }
                          // Close dropdown after a short delay to allow click events
                          setTimeout(() => {
                            setShowCityDropdown(false);
                          }, 200);
                        }}
                        onFocus={() => {
                          if (citySearchTerm || !formData.location) {
                            setShowCityDropdown(true);
                          }
                        }}
                        disabled={loading || citiesLoading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredCities.slice(0, 50).map((city, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex flex-col"
                            onClick={() => {
                              setFormData({ ...formData, location: city.name });
                              setCitySearchTerm(city.name);
                              setShowCityDropdown(false);
                              if (errors.location) {
                                setErrors({ ...errors, location: "" });
                              }
                            }}
                          >
                            <span className="font-medium">{city.name}</span>
                            <span className="text-xs text-gray-500">
                              {city.adminName1}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.location && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Create Password
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="group relative">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex items-center justify-center cursor-help">
                        i
                      </div>
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
                        <p className="font-semibold mb-1">Password requirements:</p>
                        <ul className="space-y-1">
                          <li>• At least 14 characters</li>
                          <li>• At least one uppercase letter (A-Z)</li>
                          <li>• At least one lowercase letter (a-z)</li>
                          <li>• At least one number (0-9)</li>
                          <li>• Special characters allowed (!@#$%^&*)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className={`pl-10 pr-10 h-11 ${
                        errors.password ? "border-red-500" : ""
                      }`}
                      value={formData.password}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, password: value });
                        // Real-time validation for password mismatch - preserve required error
                        const newErrors = { ...errors };
                        if (formData.confirmPassword && value && value !== formData.confirmPassword) {
                          newErrors.confirmPasswordMismatch = "Passwords do not match";
                        } else if (formData.confirmPassword && value && value === formData.confirmPassword) {
                          // Clear mismatch error if passwords match (but keep required if it exists)
                          delete newErrors.confirmPasswordMismatch;
                        }
                        setErrors(newErrors);
                      }}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              i < passwordStrength.score
                                ? passwordStrength.color
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        className={`text-xs ${passwordStrength.color.replace(
                          "bg-",
                          "text-"
                        )}`}
                      >
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="w-5 h-5"></div>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className={`pl-10 pr-10 h-11 ${
                        errors.confirmPasswordRequired ? "border-red-500" : ""
                      }`}
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          confirmPassword: value,
                        });
                        const newErrors = { ...errors };
                        
                        if (value && formData.password && value === formData.password) {
                          delete newErrors.confirmPasswordRequired;
                        } else if (!value) {
                          newErrors.confirmPasswordRequired = "Confirm password is required";
                        }
                        
                        if (value && formData.password) {
                          if (value !== formData.password) {
                            newErrors.confirmPasswordMismatch = "Passwords do not match";
                          } else {
                            delete newErrors.confirmPasswordMismatch;
                          }
                        } else if (!value) {
                          delete newErrors.confirmPasswordMismatch;
                        }
                        
                        setErrors(newErrors);
                      }}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.password === formData.confirmPassword && (
                      <div className="mt-2">
                        <p className="text-green-600 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </p>
                      </div>
                    )}
                  {errors.confirmPasswordMismatch && (
                    <div className="mt-2">
                      <p className="text-red-500 text-xs">
                        {errors.confirmPasswordMismatch}
                      </p>
                    </div>
                  )}
                  {errors.confirmPasswordRequired && (
                    <p className={`text-red-500 text-xs ${
                      errors.confirmPasswordMismatch ? "mt-3" : "mt-1"
                    }`}>
                      {errors.confirmPasswordRequired}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Uploads */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Document Verification
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload clear photos of your government-issued ID and a selfie
                holding the same ID for verification.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID Document Upload */}
                <div>
                  <Label>ID Document *</Label>
                  <input
                    ref={idDocumentRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "id")}
                  />
                  <button
                    type="button"
                    onClick={() => idDocumentRef.current?.click()}
                    className={`mt-1 w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition-colors relative ${
                      errors.idDocument ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={loading}
                  >
                    {idDocumentPreview ? (
                      <>
                        <img
                          src={idDocumentPreview}
                          alt="ID Document"
                          className="max-h-36 max-w-full object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIdDocument(null);
                            setIdDocumentPreview("");
                            if (idDocumentRef.current) {
                              idDocumentRef.current.value = "";
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center"
                          title="Delete photo"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Upload ID Document
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG up to 10MB
                        </p>
                      </>
                    )}
                  </button>
                  {errors.idDocument && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.idDocument}
                    </p>
                  )}
                </div>

                {/* Selfie with ID Upload */}
                <div>
                  <Label>Selfie with ID *</Label>
                  <input
                    ref={selfieRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "selfie")}
                  />
                  <button
                    type="button"
                    onClick={() => selfieRef.current?.click()}
                    className={`mt-1 w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition-colors relative ${
                      errors.selfieWithId ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={loading}
                  >
                    {selfieWithIdPreview ? (
                      <>
                        <img
                          src={selfieWithIdPreview}
                          alt="Selfie with ID"
                          className="max-h-36 max-w-full object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelfieWithId(null);
                            setSelfieWithIdPreview("");
                            if (selfieRef.current) {
                              selfieRef.current.value = "";
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center"
                          title="Delete photo"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Upload Selfie with ID
                        </p>
                        <p className="text-xs text-gray-400">
                          Hold your ID next to your face
                        </p>
                      </>
                    )}
                  </button>
                  {errors.selfieWithId && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.selfieWithId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
