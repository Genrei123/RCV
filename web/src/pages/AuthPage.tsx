// =========================================================================
// AUTH PAGE - LOGIN AND REGISTRATION
// =========================================================================
// This page provides both login and registration functionality with:
// - Form validation
// - Password strength indicator
// - Error handling
// - Integration with AuthService
// =========================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { AuthService } from "@/services/authService";
import type { User } from "@/typeorm/entities/user.entity";
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
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Check if user has remember me enabled and pre-fill email
  useEffect(() => {
    const tokenInfo = CookieManager.getTokenExpirationInfo();

    if (tokenInfo && !tokenInfo.isExpired && tokenInfo.rememberMe) {
      setRememberMe(true);
    }
  }, []);

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

  const validatePhoneNumber = (phone: string): boolean => {
    // Accept only 10 digits (without the +63 prefix)
    return /^\d{10}$/.test(phone);
  };

  const formatPhoneNumberForDatabase = (phone: string): string => {
    // Remove any non-digits and ensure it's 10 digits, then add +63 prefix
    const digits = phone.replace(/\D/g, "").slice(-10);
    return `+63${digits}`;
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

    if (!validatePhoneNumber(registerData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
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
        // Backend has set httpOnly cookie
        toast.success("Login successful! Redirecting...");

        // Use setTimeout to ensure state updates before navigation
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
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
      const userData: Partial<User> = {
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
        phoneNumber: registerData.phoneNumber,
        location: registerData.location,
        dateOfBirth: registerData.dateOfBirth,
        badgeId: registerData.badgeId || "",
        role: "AGENT", // Default role: Agent
      };

      const response = await AuthService.register(userData as User);

      if (response?.data) {
        // Check if account is pending approval
        if (response.data.pendingApproval || response.data.approved === false) {
          const email = response.data.user?.email || registerData.email;

          // Store email for the pending approval page
          CookieManager.setCookie("pendingApprovalEmail", email, { days: 7 });

          toast.success(
            "Registration successful! Redirecting to approval status...",
            { autoClose: 2000 }
          );

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

            setTimeout(() => {
              navigate("/dashboard", { replace: true });
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
                        placeholder="99-999-9999"
                        className={`border-0 h-11 w-full px-3 py-2.5 placeholder-neutral-400 focus:outline-none transition-colors ${
                          errors.phoneNumber
                            ? "bg-error-50"
                            : ""
                        }`}
                        value={registerData.phoneNumber}
                        onChange={(e) => {
                          // Only allow digits and limit to 10 characters
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setRegisterData({
                            ...registerData,
                            phoneNumber: value,
                          });
                        }}
                        maxLength={10}
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
                    Location *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="City, Country"
                      className={`pl-10 h-11 ${
                        errors.location ? "border-error-500" : ""
                      }`}
                      value={registerData.location}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          location: e.target.value,
                        })
                      }
                      required
                    />
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
