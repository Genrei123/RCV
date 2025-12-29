import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Wallet, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast, ToastContainer } from "react-toastify";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import "react-toastify/dist/ReactToastify.css";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

export function CompanyLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    if (!window.ethereum) {
      toast.error("MetaMask is required. Please install MetaMask browser extension.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setLoading(true);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        toast.error("No wallet found. Please create a MetaMask wallet first.");
        return;
      }

      const connectedWallet = accounts[0];

      const response = await CompanyOwnerService.login({
        email,
        password,
        walletAddress: connectedWallet,
      });

      CompanyOwnerService.setCompanyOwnerData(response.companyOwner);

      toast.success(`Welcome back, ${response.companyOwner.companyName}!`);
      navigate("/company/dashboard");
    } catch (error: any) {
      if (error.status === 'Pending') {
        navigate("/company/pending-approval");
      } else if (error.message.includes('not found') || error.message.includes('Invalid email')) {
        toast.error("Invalid email or password");
      } else if (error.message.includes('Wrong MetaMask')) {
        toast.error("Wrong MetaMask wallet. Please connect the wallet you registered with.");
      } else if (error.message.includes('rejected')) {
        toast.error("Your company registration was rejected. Please contact support.");
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
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

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block">
          <div className="text-center space-y-6">
            <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-blue-900">Company Portal</h1>
            <p className="text-xl text-gray-600">
              Secure Access for Business Owners
            </p>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-md">
              <h3 className="font-semibold text-blue-900 mb-3">Why Two-Factor Authentication?</h3>
              <ul className="text-left text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>Email/Password: Your first layer of security</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2" />
                  <span>MetaMask Wallet: Blockchain verification for company ownership</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>Enhanced protection for your business data</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Card className="p-8 shadow-2xl bg-white">
          <div className="mb-8 text-center lg:hidden">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl mb-4">
              <Building2 className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-900 mb-2">
              Company Login
            </h2>
            <p className="text-gray-600">
              Sign in with your credentials and MetaMask wallet
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@company.com"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-11"
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
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/company/forgot-password")}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Forgot Password?
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Secure Login Process:
              </h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Enter your email and password</li>
                <li>2. Click Sign In below</li>
                <li>3. Connect your MetaMask wallet when prompted</li>
                <li>4. Access your company dashboard</li>
              </ol>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 cursor-pointer text-white font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/company/register")}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Register your company
                </button>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
