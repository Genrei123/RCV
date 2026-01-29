import {
  X,
  User,
  Mail,
  MapPin,
  Calendar,
  Hash,
  Camera,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import type { ProfileUser } from "@/pages/Profile";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { toast } from "react-toastify";

interface PhilippineCity {
  name: string;
  adminName1: string;
}
import {
  validatePhilippinePhoneNumber,
  formatPhoneNumberForDatabase,
} from "@/utils/phoneValidation";
interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ProfileUser | null;
  onSave: (updatedUser: Partial<ProfileUser>) => Promise<void>;
}

export function EditProfileModal({
  isOpen,
  onClose,
  user,
  onSave,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<Partial<ProfileUser>>({});
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [philippineCities, setPhilippineCities] = useState<PhilippineCity[]>(
    []
  );
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [initialData, setInitialData] = useState<Partial<ProfileUser> | null>(
    null
  );

  /**
   * Normalize phone number for display/editing
   * Accepts both "+639XXXXXXXXX" and "+6309XXXXXXXXX" formats
   * Returns only the 10 digits (without +63 prefix and without leading 0)
   */
  const normalizePhoneForEdit = (phone: string): string => {
    if (!phone) return "";
    
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, "");
    
    // If it starts with 63 (country code), remove it
    let withoutCountryCode = digitsOnly;
    if (digitsOnly.startsWith("63")) {
      withoutCountryCode = digitsOnly.substring(2);
    }
    
    // If it starts with 0 (leading zero), remove it to get 10 digits
    if (withoutCountryCode.startsWith("0") && withoutCountryCode.length === 11) {
      return withoutCountryCode.substring(1);
    }
    
    // If it's already 10 digits starting with 9, return as is
    if (withoutCountryCode.length === 10 && withoutCountryCode.startsWith("9")) {
      return withoutCountryCode;
    }
    
    // Otherwise return what we have (trimmed to last 10 digits if needed)
    if (withoutCountryCode.length > 10) {
      return withoutCountryCode.substring(withoutCountryCode.length - 10);
    }
    
    return withoutCountryCode;
  };

  useEffect(() => {
    if (user) {
      const normalizedData: Partial<ProfileUser> = {
        firstName: (user.firstName || "").replace(/[0-9]/g, ""),
        middleName: user.middleName || "",
        lastName: (user.lastName || "").replace(/[0-9]/g, ""),
        email: user.email || "",
        phoneNumber: normalizePhoneForEdit(user.phoneNumber || ""),
        location: user.location || "",
        dateOfBirth: user.dateOfBirth || "",
        badgeId: user.badgeId || "",
        avatar: user.avatar || undefined,
      };

      setFormData(normalizedData);
      setInitialData(normalizedData);
      setCitySearchTerm(user.location || "");
      // prefer local override for preview if exists
      try {
        const saved = localStorage.getItem("profile_avatar_data");
        setAvatarPreview(saved || user.avatar || null);
      } catch {
        setAvatarPreview(user.avatar || null);
      }
    }
  }, [user]);

  // Fetch Philippine cities on mount
  useEffect(() => {
    const fetchPhilippineCities = async () => {
      try {
        const response = await fetch("https://psgc.gitlab.io/api/cities/");
        const data = await response.json();

        if (data && Array.isArray(data)) {
          const cities = data
            .map((city: any) => ({
              name: city.name || city.cityName,
              adminName1: city.province || city.regionName || "Philippines",
            }))
            .sort((a: PhilippineCity, b: PhilippineCity) =>
              a.name.localeCompare(b.name)
            );

          setPhilippineCities(cities);
        }
      } catch (err) {
        console.error("Failed to fetch Philippine cities:", err);
        try {
          const fallbackResponse = await fetch(
            "https://psgc.rootscratch.com/cities/"
          );
          const fallbackData = await fallbackResponse.json();

          if (fallbackData && Array.isArray(fallbackData)) {
            const cities = fallbackData
              .map((city: any) => ({
                name: city.name || city.cityName,
                adminName1: city.province || city.regionName || "Philippines",
              }))
              .sort((a: PhilippineCity, b: PhilippineCity) =>
                a.name.localeCompare(b.name)
              );

            setPhilippineCities(cities);
          }
        } catch (fallbackErr) {
          console.error("Fallback API also failed:", fallbackErr);
          setPhilippineCities([]);
        }
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchPhilippineCities();
  }, []);

  // Hide body scroll when modal or city dropdown is open
  useEffect(() => {
    if (isOpen || showCityDropdown) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, showCityDropdown]);

  if (!isOpen || !user) return null;

  // Avatar handlers
  const openFilePicker = () => fileInputRef.current?.click();

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onCancelCrop = () => {
    setCropOpen(false);
    setCropImageSrc(null);
  };

  const onSaveCropped = async (dataUrl: string) => {
    setUploadingAvatar(true);
    try {
      // Save to localStorage for immediate preview
      localStorage.setItem("profile_avatar_data", dataUrl);
      setAvatarPreview(dataUrl);

      // Upload to Firebase Storage
      if (user?._id) {
        console.log(
          "📤 Uploading avatar to Firebase Storage for user:",
          user._id
        );

        // Convert base64 to File
        const file = FirebaseStorageService.dataUrlToFile(
          dataUrl,
          `avatar_${user._id}.jpg`
        );

        // Upload to Firebase Storage
        const firebaseUrl = await FirebaseStorageService.uploadAvatar(
          user._id,
          file
        );

        if (firebaseUrl) {
          console.log("✅ Avatar uploaded to Firebase:", firebaseUrl);
          // Use Firebase URL instead of base64
          setFormData((prev) => ({ ...prev, avatar: firebaseUrl }));
        } else {
          console.warn("⚠️ Firebase upload failed, using base64 fallback");
          setFormData((prev) => ({ ...prev, avatar: dataUrl }));
        }
      } else {
        console.warn("⚠️ No user ID, using base64 only");
        setFormData((prev) => ({ ...prev, avatar: dataUrl }));
      }

      // Notify other components
      window.dispatchEvent(new CustomEvent("profile-avatar-updated"));
    } catch (error) {
      console.error("❌ Error processing avatar:", error);
      // Fallback to base64 if Firebase upload fails
      setFormData((prev) => ({ ...prev, avatar: dataUrl }));
    } finally {
      setUploadingAvatar(false);
      setCropOpen(false);
      setCropImageSrc(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.phoneNumber?.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (formData.phoneNumber && formData.phoneNumber.length > 0) {
      const phoneValidation = validatePhilippinePhoneNumber(
        formData.phoneNumber
      );
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber = phoneValidation.error || "Invalid phone number";
      }
    }
    
    if (!formData.badgeId?.trim()) {
      newErrors.badgeId = "Badge ID is required";
    }
    
    if (!formData.location?.trim()) {
      newErrors.location = "Location is required";
    }
    
    // Check date of birth is required and user is at least 18 years old
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      }
    }

    // If there are errors, show them and don't proceed
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    try {
      // Format phone number before saving
      const dataToSave = {
        ...formData,
        phoneNumber: formData.phoneNumber
          ? formatPhoneNumberForDatabase(formData.phoneNumber)
          : "",
      };
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileUser, value: string) => {
    // Filter out numbers from firstName and lastName
    if (field === "firstName" || field === "lastName") {
      value = value.replace(/[0-9]/g, "");
    }
    
    // Limit phone number to 10 digits only
    if (field === "phoneNumber") {
      // Remove all non-digit characters
      const digitsOnly = value.replace(/\D/g, "");
      // Keep only first 10 digits
      value = digitsOnly.substring(0, 10);
    }
    
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const isDirty = (() => {
    if (!initialData) return false;

    const fields: (keyof ProfileUser)[] = [
      "firstName",
      "middleName",
      "lastName",
      "email",
      "phoneNumber",
      "location",
      "dateOfBirth",
      "badgeId",
      "avatar",
    ];

    return fields.some((field) => {
      const current = formData[field] ?? "";
      const initial = initialData[field] ?? "";
      return current !== initial;
    });
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <User className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <p className="text-sm text-gray-500">
                Update your personal information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={uploadingAvatar}
                  className="group relative w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Change avatar"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-500" />
                  )}
                  {uploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      <Camera className="absolute bottom-2 right-2 w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileSelected}
                  capture="environment"
                  className="hidden"
                />
              </div>
              <div>
                {uploadingAvatar ? (
                  <p className="text-sm text-teal-600 font-medium">
                    Uploading avatar...
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Click the avatar to upload and crop a new photo.
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG/JPG, will be cropped to a circle.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstName || ""}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="Enter first name"
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Middle Name
                  </label>
                  <Input
                    value={formData.middleName || ""}
                    onChange={(e) => handleChange("middleName", e.target.value)}
                    placeholder="Enter middle name (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastName || ""}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Enter last name"
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={formData.dateOfBirth || ""}
                      onChange={(e) =>
                        handleChange("dateOfBirth", e.target.value)
                      }
                      className={`pl-10 ${
                        errors.dateOfBirth ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-xs text-red-500">{errors.dateOfBirth}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={formData.email || ""}
                      readOnly
                      placeholder="Enter email address"
                      className={`pl-10 cursor-not-allowed ${
                        errors.email ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                      +63
                    </span>
                    <Input
                      type="tel"
                      value={formData.phoneNumber || ""}
                      onChange={(e) => handleChange("phoneNumber", e.target.value)}
                      placeholder="9991113333"
                      className={`pl-10 ${
                        errors.phoneNumber ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-xs text-red-500">{errors.phoneNumber}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Location (Philippine Cities)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder={
                        citiesLoading ? "Loading cities..." : "Search city..."
                      }
                      className={`pl-10 pr-10 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                        errors.location ? "border-red-500" : "border-input"
                      }`}
                      value={citySearchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCitySearchTerm(value);
                        // Clear formData.location when user is typing (not a selected city yet)
                        setFormData(prev => ({ ...prev, location: "" }));
                        if (value) {
                          setShowCityDropdown(true);
                        }
                      }}
                      onFocus={() => {
                        setShowCityDropdown(true);
                      }}
                      onBlur={() => {
                        // Only close dropdown if a city was already selected
                        setTimeout(() => {
                          setShowCityDropdown(false);
                        }, 100);
                      }}
                      disabled={citiesLoading}
                    />
                    <ChevronDown
                      className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none transition-transform ${
                        showCityDropdown ? "rotate-180" : ""
                      }`}
                    />
                    {showCityDropdown && !citiesLoading && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                        {philippineCities
                          .filter((city) =>
                            `${city.name}, ${city.adminName1}`
                              .toLowerCase()
                              .includes(citySearchTerm.toLowerCase())
                          )
                          .map((city, index) => (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const cityValue = `${city.name}, ${city.adminName1}`;
                                handleChange("location", cityValue);
                                setCitySearchTerm(cityValue);
                                setShowCityDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-teal-500/10 hover:text-teal-600 transition-colors text-sm"
                            >
                              {city.name}, {city.adminName1}
                            </button>
                          ))}
                        {philippineCities.filter((city) =>
                          `${city.name}, ${city.adminName1}`
                            .toLowerCase()
                            .includes(citySearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No cities found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.location && (
                    <p className="text-xs text-red-500">{errors.location}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Official Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Official Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Badge ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={formData.badgeId || ""}
                      onChange={(e) => handleChange("badgeId", e.target.value)}
                      readOnly
                      placeholder="Enter badge ID"
                      className={`pl-10 cursor-not-allowed ${
                        errors.badgeId ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.badgeId && (
                    <p className="text-xs text-red-500">{errors.badgeId}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t mt-6 ">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploadingAvatar}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || uploadingAvatar || !isDirty}
            >
              {loading
                ? "Saving..."
                : uploadingAvatar
                ? "Uploading..."
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
      {/* Avatar Crop Dialog */}
      {cropImageSrc && (
        <AvatarCropDialog
          open={cropOpen}
          imageSrc={cropImageSrc}
          onCancel={onCancelCrop}
          onSave={onSaveCropped}
        />
      )}
    </div>
  );
}
