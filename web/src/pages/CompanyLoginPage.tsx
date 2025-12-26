import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-toastify";
import { CompanyOwnerService } from "@/services/companyOwnerService";

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

  const handleLogin = async () => {
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

      const walletAddress = accounts[0];

      const response = await CompanyOwnerService.login({ walletAddress });

      CompanyOwnerService.setCompanyOwnerData(response.companyOwner);

      toast.success(`Welcome back, ${response.companyOwner.companyName}!`);
      navigate("/company/dashboard");
    } catch (error: any) {
      if (error.status === 'Pending') {
        navigate("/company/pending-approval");
      } else if (error.message.includes('not found')) {
        toast.error("Wallet not registered. Please register your company first.");
        setTimeout(() => navigate("/company/register"), 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
                Company Login
              </h1>
              <p className="text-gray-600">
                Sign in with your MetaMask wallet
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  How it works:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Click the button below to connect MetaMask</li>
                  <li>2. Approve the connection request</li>
                  <li>3. You'll be automatically signed in</li>
                </ol>
              </div>

              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 cursor-pointer"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Sign In with MetaMask
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
