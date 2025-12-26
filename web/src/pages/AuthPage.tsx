// =========================================================================
// AUTH PAGE - LOGIN AND REGISTRATION
// =========================================================================
// This page provides both login and registration functionality with:
// - Form validation
// - Password strength indicator
// - Error handling
// - Integration with AuthService
// =========================================================================

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  ArrowLeft,
} from "lucide-react";
import { AuthService } from "@/services/authService";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import type { User } from "@/typeorm/entities/user.entity";
import {
  validatePhilippinePhoneNumber,
  formatPhoneNumberForDatabase,
  formatPhoneNumberForDisplay,
} from "@/utils/phoneValidation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CookieManager } from "@/utils/cookies";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  firstName: string;
  lastName: string;
  middleName: string;
  extName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  location: string;
  dateOfBirth: string;
  badgeId: string;
  walletAddress: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

interface PhilippineCity {
  name: string;
  adminName1: string; // Province/Region
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [philippineCities, setPhilippineCities] = useState<PhilippineCity[]>(
    []
  );
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCompanyName, setInviteCompanyName] = useState<string>("");
  const [inviteCompanyId, setInviteCompanyId] = useState<string>("");

  // Check for invite token in URL
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      setInviteToken(token);
      setIsLogin(false); // Switch to registration mode
      validateInviteToken(token);
    }
  }, [searchParams]);

  const validateInviteToken = async (token: string) => {
    try {
      const response = await CompanyOwnerService.validateInviteToken(token);
      if (response.success) {
        setInviteCompanyName(response.companyOwner.companyName);
        setInviteCompanyId(response.companyOwner._id);
        toast.success(`You're invited to join ${response.companyOwner.companyName}!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid invite link');
      setInviteToken(null);
    }
  };

  // Fetch Philippine cities and municipalities on component mount
  useEffect(() => {
    const fetchPhilippineCities = async () => {
      try {
        // Fetch both cities and municipalities from PSGC API
        const [citiesResponse, municipalitiesResponse] = await Promise.all([
          fetch("https://psgc.gitlab.io/api/cities/"),
          fetch("https://psgc.gitlab.io/api/municipalities/"),
        ]);

        const citiesData = await citiesResponse.json();
        const municipalitiesData = await municipalitiesResponse.json();

        let allLocations: PhilippineCity[] = [];

        // Process cities
        if (citiesData && Array.isArray(citiesData)) {
          const cities = citiesData
            .map((city: any) => ({
              name: city.name || city.cityName,
              adminName1: city.province || city.regionName || "Philippines",
            }))
            .sort((a: PhilippineCity, b: PhilippineCity) =>
              a.name.localeCompare(b.name)
            );
          allLocations = [...allLocations, ...cities];
        }

        // Process municipalities
        if (municipalitiesData && Array.isArray(municipalitiesData)) {
          const municipalities = municipalitiesData
            .map((municipality: any) => ({
              name: municipality.name || municipality.municipalityName,
              adminName1:
                municipality.province ||
                municipality.regionName ||
                "Philippines",
            }))
            .sort((a: PhilippineCity, b: PhilippineCity) =>
              a.name.localeCompare(b.name)
            );
          allLocations = [...allLocations, ...municipalities];
        }

        // Sort all locations alphabetically
        allLocations.sort((a: PhilippineCity, b: PhilippineCity) =>
          a.name.localeCompare(b.name)
        );

        console.log("Loaded cities and municipalities:", allLocations.length);
        setPhilippineCities(allLocations);
      } catch (err) {
        console.error(
          "Failed to fetch Philippine cities and municipalities:",
          err
        );
        // Fallback: Try alternative PSGC endpoint
        try {
          const [citiesFallback, municipalitiesFallback] = await Promise.all([
            fetch("https://psgc.rootscratch.com/cities/"),
            fetch("https://psgc.rootscratch.com/municipalities/"),
          ]);

          const citiesFallbackData = await citiesFallback.json();
          const municipalitiesFallbackData =
            await municipalitiesFallback.json();

          let allLocations: PhilippineCity[] = [];

          if (citiesFallbackData && Array.isArray(citiesFallbackData)) {
            const cities = citiesFallbackData
              .map((city: any) => ({
                name: city.name || city.cityName,
                adminName1: city.province || city.regionName || "Philippines",
              }))
              .sort((a: PhilippineCity, b: PhilippineCity) =>
                a.name.localeCompare(b.name)
              );
            allLocations = [...allLocations, ...cities];
          }

          if (
            municipalitiesFallbackData &&
            Array.isArray(municipalitiesFallbackData)
          ) {
            const municipalities = municipalitiesFallbackData
              .map((municipality: any) => ({
                name: municipality.name || municipality.municipalityName,
                adminName1:
                  municipality.province ||
                  municipality.regionName ||
                  "Philippines",
              }))
              .sort((a: PhilippineCity, b: PhilippineCity) =>
                a.name.localeCompare(b.name)
              );
            allLocations = [...allLocations, ...municipalities];
          }

          allLocations.sort((a: PhilippineCity, b: PhilippineCity) =>
            a.name.localeCompare(b.name)
          );

          setPhilippineCities(allLocations);
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

  // Check if user has remember me enabled and pre-fill email
  useEffect(() => {
    const tokenInfo = CookieManager.getTokenExpirationInfo();

    if (tokenInfo && !tokenInfo.isExpired && tokenInfo.rememberMe) {
      setRememberMe(true);
    }
  }, []);

  // Hide body scroll when city dropdown is open
  useEffect(() => {
    if (showCityDropdown) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showCityDropdown]);

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    middleName: "",
    extName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    location: "",
    dateOfBirth: "",
    badgeId: "",
    walletAddress: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
  >({});

  // =========================================================================
  // VALIDATION FUNCTIONS
  // =========================================================================

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-error-500" };
    if (score <= 4) return { score, label: "Fair", color: "bg-yellow-500" };
    if (score <= 5) return { score, label: "Good", color: "bg-blue-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateRegisterForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    if (!registerData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // middleName and extName are optional, no validation needed

    if (!registerData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!validateEmail(registerData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!validatePassword(registerData.password)) {
      newErrors.password =
        "Password must be at least 8 characters with uppercase, lowercase, and number";
    }

    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (registerData.phoneNumber) {
      const phoneValidation = validatePhilippinePhoneNumber(
        registerData.phoneNumber
      );
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber =
          phoneValidation.error || "Please enter a valid phone number";
      }
    } else {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (!registerData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!registerData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    }

    if (!registerData.badgeId.trim()) {
      newErrors.badgeId = "Badge ID is required";
    }

    // Validate wallet address if registering via invite (employee registration)
    if (inviteToken && !registerData.walletAddress.trim()) {
      newErrors.walletAddress = "Wallet address is required for employee registration";
    }

    // Validate Ethereum wallet address format
    if (registerData.walletAddress && !registerData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.walletAddress = "Please enter a valid Ethereum wallet address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =========================================================================
  // FORM HANDLERS
  // =========================================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(loginData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!loginData.password) {
      toast.error("Password is required");
      return;
    }

    setLoading(true);

    try {
      const response = await AuthService.login({
        email: loginData.email,
        password: loginData.password,
        rememberMe: rememberMe,
      });

      if (response?.data.token) {
        const user = response.data.user;

        // Check if user has a wallet address registered
        // If so, require wallet verification before allowing access
        if (user?.walletAddress) {
          // Add a small delay to ensure UI is rendered
          await new Promise(resolve => setTimeout(resolve, 500));
          
          toast.info("🔐 Wallet verification required. Please connect your MetaMask wallet...", {
            autoClose: false,
            closeButton: false,
          });
          
          try {
            if (typeof window.ethereum === 'undefined') {
              setLoading(false);
              toast.dismiss();
              toast.error("MetaMask is not installed. Please install MetaMask extension to continue.", {
                autoClose: 8000,
              });
              // Logout the user
              await AuthService.logout();
              return;
            }

            // Request wallet connection with better error handling
            let accounts;
            try {
              accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
              });
            } catch (connectError: any) {
              setLoading(false);
              toast.dismiss();
              
              if (connectError.code === 4001) {
                toast.error("Wallet connection rejected. You must connect your wallet to login.", {
                  autoClose: 5000,
                });
              } else {
                toast.error("Failed to connect wallet: " + connectError.message, {
                  autoClose: 5000,
                });
              }
              
              // Logout the user
              await AuthService.logout();
              return;
            }

            if (!accounts || accounts.length === 0) {
              setLoading(false);
              toast.dismiss();
              toast.error("No wallet connected. Please connect your MetaMask wallet to continue.", {
                autoClose: 5000,
              });
              // Logout the user
              await AuthService.logout();
              return;
            }

            const connectedWallet = accounts[0].toLowerCase();
            const registeredWallet = user.walletAddress.toLowerCase();

            // Verify wallet addresses match
            if (connectedWallet !== registeredWallet) {
              setLoading(false);
              toast.dismiss();
              
              // Logout the user since wallet doesn't match
              await AuthService.logout();
              
              toast.error(
                <div>
                  <div className="font-bold mb-1">❌ Wallet Mismatch!</div>
                  <div className="text-sm">Expected: {user.walletAddress.substring(0, 10)}...{user.walletAddress.substring(38)}</div>
                  <div className="text-sm">Connected: {accounts[0].substring(0, 10)}...{accounts[0].substring(38)}</div>
                  <div className="text-xs mt-2">Please connect the wallet address you registered with.</div>
                </div>,
                {
                  autoClose: 10000,
                }
              );
              return;
            }

            toast.dismiss();
            toast.success("✅ Wallet verified successfully!", {
              autoClose: 2000,
            });
            
            // Small delay to show success message
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (walletError: any) {
            setLoading(false);
            toast.dismiss();
            
            // Logout the user if wallet verification fails
            await AuthService.logout();
            
            console.error("Wallet verification error:", walletError);
            toast.error("Wallet verification failed: " + (walletError.message || "Unknown error"), {
              autoClose: 5000,
            });
            return;
          }
        }

        // Backend has set httpOnly cookie
        toast.success("Login successful! Redirecting...");

        // Smart routing based on user type and access levels
        let targetRoute = "/dashboard"; // Default fallback
        
        if (user) {
          // SuperAdmins and Admins go to system-wide dashboard
          if (user.isSuperAdmin || user.role === 'ADMIN') {
            targetRoute = "/dashboard";
          } 
          // Employees with company and web access go to company dashboard
          else if (user.companyOwnerId && user.hasWebAccess) {
            targetRoute = "/company/dashboard";
          }
        }

        // Use setTimeout to ensure state updates before navigation
        setTimeout(() => {
          navigate(targetRoute, { replace: true });
          window.location.reload(); // Force reload to update auth state
        }, 500);
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.log("Login error caught:", err);
      console.log("Error response:", err.response);
      console.log("Error status:", err.response?.status || err.status);
      console.log("Error data:", err.response?.data);

      // Check if the error is due to unapproved account
      // Check both err.response.status and err.status (axios error structure can vary)
      const status = err.response?.status || err.status;
      const isUnapproved =
        status === 403 || err.response?.data?.approved === false;

      if (isUnapproved) {
        const email = err.response?.data?.email || loginData.email;

        console.log(
          "Unapproved account detected, redirecting to pending approval page"
        );

        // Store email for the pending approval page
        CookieManager.setCookie("pendingApprovalEmail", email, { days: 7 });

        // Navigate to pending approval page
        navigate("/pending-approval", {
          state: { email },
          replace: true,
        });
        return; // Don't show error toast
      }

      // For all other errors
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateRegisterForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setLoading(true);

    try {
      const userData: Partial<User> & { 
        companyOwnerId?: string;
        companyId?: string;
        inviteToken?: string;
        walletAddress?: string;
      } = {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        middleName: registerData.middleName || undefined,
        extName: registerData.extName || undefined,
        fullName:
          `${registerData.firstName} ${registerData.middleName} ${registerData.lastName} ${registerData.extName}`
            .replace(/\s+/g, " ")
            .trim(),
        email: registerData.email,
        password: registerData.password,
        phoneNumber: formatPhoneNumberForDatabase(registerData.phoneNumber),
        location: registerData.location,
        dateOfBirth: registerData.dateOfBirth,
        badgeId: registerData.badgeId || "",
        role: "AGENT", // Default role: Agent
        walletAddress: registerData.walletAddress || undefined, // Add wallet address for employee verification
        companyOwnerId: inviteToken ? inviteCompanyId : undefined, // Link to company if invited
        companyId: inviteToken ? inviteCompanyId : undefined, // Backend expects this field name
        inviteToken: inviteToken || undefined, // Include invite token for backend validation
      };

      const response = await AuthService.register(userData as User);

      // Mark invite token as used if registration was via invite link
      if (inviteToken && response?.data) {
        try {
          await CompanyOwnerService.markInviteTokenAsUsed(inviteToken);
        } catch (tokenError) {
          console.error('Failed to mark invite token as used:', tokenError);
        }
      }

      if (response?.data) {
        // Check if account is pending approval
        if (response.data.pendingApproval || response.data.approved === false) {
          const email = response.data.user?.email || registerData.email;

          // Store email for the pending approval page
          CookieManager.setCookie("pendingApprovalEmail", email, { days: 7 });

          const message = inviteToken 
            ? `Registration successful! Your request to join ${inviteCompanyName} is pending approval.`
            : "Registration successful! Redirecting to approval status...";
          
          toast.success(message, { autoClose: 2000 });

          // Navigate to pending approval page
          setTimeout(() => {
            navigate("/pending-approval", {
              state: { email },
              replace: true,
            });
          }, 1500);
        } else {
          // If somehow already approved, try auto-login
          toast.success("Registration successful! Logging you in...");

          const loginResponse = await AuthService.login({
            email: registerData.email,
            password: registerData.password,
            rememberMe: false,
          });

          if (loginResponse?.data.token) {
            // Backend has set httpOnly cookie
            
            // Smart routing based on user type and access levels
            const user = loginResponse.data.user;
            
            let targetRoute = "/dashboard"; // Default fallback
            
            if (user) {
              // SuperAdmins and Admins go to system-wide dashboard
              if (user.isSuperAdmin || user.role === 'ADMIN') {
                targetRoute = "/dashboard";
              } 
              // Employees with company and web access go to company dashboard
              else if (user.companyOwnerId && user.hasWebAccess) {
                targetRoute = "/company/dashboard";
              }
            }

            setTimeout(() => {
              navigate(targetRoute, { replace: true });
              window.location.reload();
            }, 500);
          } else {
            setIsLogin(true);
            toast.info("Account created successfully! Please log in.");
          }
        }
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMessage);
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const passwordStrength = getPasswordStrength(registerData.password);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
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
      
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <div className="text-center space-y-6">
            <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-[#00B087] rounded-xl flex items-center justify-center">
                <img
                  src="/logo.svg"
                  alt="RCV Logo"
                  className="w-16 h-16 object-contain"
                  draggable="false"
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-primary">RCV System</h1>
            <p className="text-xl text-neutral-600">
              Secure Product Verification & Management
            </p>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <Card className="p-8 shadow-2xl bg-white">
          <div className="mb-8 text-center lg:hidden">
            <div className="inline-block p-4 bg-gradient-to-br from-primary to-[#00B087] rounded-xl mb-4">
              <img
                src="/logo.svg"
                alt="RCV Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-primary mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-neutral-600">
              {isLogin
                ? "Sign in to continue to RCV System"
                : "Sign up to get started with RCV System"}
            </p>
          </div>

          {inviteToken && !isLogin && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-900 text-sm font-semibold">You're invited!</p>
                <p className="text-blue-700 text-sm">
                  You're registering as an employee of <strong>{inviteCompanyName}</strong>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
              <p className="text-error-600 text-sm flex-1">{error}</p>
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 h-11"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 rounded border-neutral-300 text-primary focus:ring-primary"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-sm text-neutral-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:text-[#00B087] font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-[#00B087] text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="John"
                      className={`pl-10 h-11 ${
                        errors.firstName ? "border-error-500" : ""
                      }`}
                      value={registerData.firstName}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          firstName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Middle Name (Optional)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="M."
                      className={`pl-10 h-11 ${
                        errors.middleName ? "border-error-500" : ""
                      }`}
                      value={registerData.middleName}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          middleName: e.target.value,
                        })
                      }
                    />
                  </div>
                  {errors.middleName && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.middleName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Doe"
                      className={`pl-10 h-11 ${
                        errors.lastName ? "border-error-500" : ""
                      }`}
                      value={registerData.lastName}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          lastName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Extension Name (Optional)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Jr., Sr., III, etc."
                      className={`pl-10 h-11 ${
                        errors.extName ? "border-error-500" : ""
                      }`}
                      value={registerData.extName}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          extName: e.target.value,
                        })
                      }
                    />
                  </div>
                  {errors.extName && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.extName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    className={`pl-10 h-11 ${
                      errors.email ? "border-error-500" : ""
                    }`}
                    value={registerData.email}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-error-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      className={`pl-10 pr-10 h-11 ${
                        errors.password ? "border-error-500" : ""
                      }`}
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {registerData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${passwordStrength.color}`}
                            style={{
                              width: `${(passwordStrength.score / 6) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-neutral-600">
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      className={`pl-10 pr-10 h-11 ${
                        errors.confirmPassword ? "border-error-500" : ""
                      }`}
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {registerData.confirmPassword &&
                    registerData.password === registerData.confirmPassword && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600">
                          Passwords match
                        </span>
                      </div>
                    )}
                  {errors.confirmPassword && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="flex gap-0 rounded-lg">
                    {/* Country Code Prefix with Icon */}
                    <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2.5 border-r border-neutral-300 pr-3 pointer-events-none">
                      <Phone className="text-neutral-500 w-5 h-5" />
                      <span className="text-neutral-700 whitespace-nowrap">
                        +63
                      </span>
                    </div>
                    {/* Phone Input */}
                    <div className="flex-1 relative">
                      <Input
                        type="tel"
                        placeholder="999-496-1370"
                        className={`border-0 h-11 w-full px-3 py-2.5 placeholder-neutral-400 focus:outline-none transition-colors ${
                          errors.phoneNumber ? "bg-error-50" : ""
                        }`}
                        value={formatPhoneNumberForDisplay(
                          registerData.phoneNumber
                        )}
                        onChange={(e) => {
                          // Remove dashes and only allow digits, limit to 10 characters
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setRegisterData({
                            ...registerData,
                            phoneNumber: value,
                          });
                        }}
                        maxLength={12}
                        required
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-error-500 text-xs mt-2">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Location (Philippines) *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5 pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder={
                        citiesLoading ? "Loading cities..." : "Search city..."
                      }
                      className={`pl-10 pr-10 h-11 w-full border rounded-md bg-background text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${
                        errors.location
                          ? "border-error-500"
                          : "border-neutral-300"
                      }`}
                      value={
                        showCityDropdown
                          ? citySearchTerm
                          : registerData.location
                      }
                      onChange={(e) => {
                        setCitySearchTerm(e.target.value);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => {
                        setShowCityDropdown(true);
                      }}
                      onBlur={() => {
                        setShowCityDropdown(false);
                      }}
                      disabled={citiesLoading}
                      required={!registerData.location}
                    />
                    <ChevronDown
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none transition-transform ${
                        showCityDropdown ? "rotate-180" : ""
                      }`}
                    />
                    {showCityDropdown && !citiesLoading && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-lg z-50 max-h-65 overflow-y-auto">
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
                              onMouseDown={() => {
                                setRegisterData({
                                  ...registerData,
                                  location: `${city.name}, ${city.adminName1}`,
                                });
                                setShowCityDropdown(false);
                                setCitySearchTerm("");
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-sm"
                            >
                              {city.name}, {city.adminName1}
                            </button>
                          ))}
                        {philippineCities.filter((city) =>
                          `${city.name}, ${city.adminName1}`
                            .toLowerCase()
                            .includes(citySearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-neutral-500 text-sm">
                            No cities found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.location && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="date"
                      className={`pl-10 h-11 ${
                        errors.dateOfBirth ? "border-error-500" : ""
                      }`}
                      value={registerData.dateOfBirth}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          dateOfBirth: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Badge ID *
                  </label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="BADGE-12345"
                      className={`pl-10 h-11 ${
                        errors.badgeId ? "border-error-500" : ""
                      }`}
                      value={registerData.badgeId}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          badgeId: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  {errors.badgeId && (
                    <p className="text-error-500 text-xs mt-1">
                      {errors.badgeId}
                    </p>
                  )}
                </div>

                {/* Wallet Address Field - Show for employee registration (invite token) */}
                {inviteToken && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Wallet Address (MetaMask) *
                    </label>
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M21.59 4.99l-7.89 5.7 1.47-3.39 6.42-2.31zm-18.18 0l6.36 2.28 1.42 3.42-7.78-5.7zm15.45 11.82l-2.12 3.16-4.56 1.26 2.27-2.71 4.41-1.71zm-12.86 0l4.41 1.71 2.27 2.71-4.56-1.26-2.12-3.16zm6.43-3.29l-1.99 1.5-1.99-1.5 1.99-4.99 1.99 4.99z" />
                      </svg>
                      <Input
                        type="text"
                        placeholder="0x..."
                        className={`pl-10 h-11 ${
                          errors.walletAddress ? "border-error-500" : ""
                        }`}
                        value={registerData.walletAddress}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            walletAddress: e.target.value,
                          })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (typeof window.ethereum !== 'undefined') {
                            try {
                              const accounts = await window.ethereum.request({ 
                                method: 'eth_requestAccounts' 
                              });
                              if (accounts && accounts.length > 0) {
                                setRegisterData({
                                  ...registerData,
                                  walletAddress: accounts[0],
                                });
                                toast.success("Wallet connected!");
                              }
                            } catch (error: any) {
                              toast.error("Failed to connect wallet: " + error.message);
                            }
                          } else {
                            toast.error("Please install MetaMask to connect your wallet");
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                    {errors.walletAddress && (
                      <p className="text-error-500 text-xs mt-1">
                        {errors.walletAddress}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">
                      You'll need to verify with this wallet when logging in
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 mr-2 rounded border-neutral-300 text-primary focus:ring-primary"
                  required
                />
                <span className="text-sm text-neutral-600">
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-primary hover:text-[#00B087] font-medium"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-primary hover:text-[#00B087] font-medium"
                  >
                    Privacy Policy
                  </a>
                </span>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-[#00B087] text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {/* Toggle Login/Register + Contact Us */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setErrors({});
                }}
                className="text-primary hover:text-[#00B087] font-semibold"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
