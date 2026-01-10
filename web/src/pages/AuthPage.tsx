// =========================================================================
// AUTH PAGE - LOGIN ONLY (Registration is Invite-Based)
// =========================================================================
// This page provides login functionality. Registration is handled through
// admin invitations via the AgentRegistration page.
// =========================================================================

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
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { AuthService } from "@/services/authService";
import { AdminInviteService } from "@/services/adminInviteService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CookieManager } from "@/utils/cookies";

interface LoginFormData {
  email: string;
  password: string;
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  
  // If invite token is present, verify with backend first then redirect to agent registration
  useEffect(() => {
    const verifyAndRedirect = async () => {
      if (inviteToken) {
        try {
          const response = await AdminInviteService.verifyInviteToken(inviteToken);
          if (response.success && response.invite) {
            navigate(`/agent-registration?invite=${inviteToken}`, { replace: true });
          } else {
            toast.error("Invalid or expired invitation link.");
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || "Invalid or expired invitation link.";
          toast.error(errorMessage);
          console.error("Invite token verification failed:", err);
        }
      }
    };
    
    verifyAndRedirect();
  }, [inviteToken, navigate]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  // Check if user has remember me enabled
  useEffect(() => {
    const tokenInfo = CookieManager.getTokenExpirationInfo();
    if (tokenInfo && !tokenInfo.isExpired && tokenInfo.rememberMe) {
      setRememberMe(true);
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
        toast.success("Login successful! Redirecting...");
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
          window.location.reload();
        }, 500);
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.log("Login error caught:", err);

      const status = err.response?.status || err.status;
      const isUnapproved =
        status === 403 || err.response?.data?.approved === false;

      if (isUnapproved) {
        const email = err.response?.data?.email || loginData.email;
        CookieManager.setCookie("pendingApprovalEmail", email, { days: 7 });
        navigate("/pending-approval", {
          state: { email },
          replace: true,
        });
        return;
      }

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

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

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
      
      {/* Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </button>

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

        {/* Right Side - Login Form */}
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
              Welcome Back
            </h2>
            <p className="text-neutral-600">
              Sign in to continue to RCV System
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
              <p className="text-error-600 text-sm flex-1">{error}</p>
            </div>
          )}

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

          {/* Info about invite-based registration */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-sm text-center text-neutral-500">
              New agents must be invited by an administrator.
              <br />
              Contact your admin if you need access.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
