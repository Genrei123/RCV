import { useNavigate } from "react-router-dom";
import { Building2, Users, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";

export function GetStartedPage() {
  const navigate = useNavigate();

  // Clear all authentication data when landing on this page
  useEffect(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to RCV
          </h1>
          <p className="text-xl text-gray-600">
            Select how you'd like to access the RCV platform
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Companies Card - Active */}
          <Card className="relative overflow-hidden hover:shadow-xl transition-shadow border-2 border-blue-500">
            <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Available Now
            </div>
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                For Companies
              </h2>
              <p className="text-gray-600 mb-6">
                Register your company and manage product certificates with blockchain security. 
                Perfect for manufacturers and distributors.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>Company registration & verification</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>Bulk certificate generation</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>Advanced analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>Multi-user team management</span>
                </li>
              </ul>
              <Button
                onClick={() => navigate('/company/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Get Started as Company
              </Button>
            </CardContent>
          </Card>

          {/* Employees Card - Active */}
          <Card className="relative overflow-hidden hover:shadow-xl transition-shadow border-2 border-green-500">
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Available Now
            </div>
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                For Employees
              </h2>
              <p className="text-gray-600 mb-6">
                Access the employee portal to manage products, verify certificates, 
                and track analytics for your organization.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                  <span>Product registration & management</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                  <span>Certificate verification & downloads</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                  <span>Real-time analytics & reports</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                  <span>Blockchain integration</span>
                </li>
              </ul>
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              >
                Continue to Login
              </Button>
            </CardContent>
          </Card>

          {/* Verify Certificate Card - Public Access */}
          <Card className="relative overflow-hidden hover:shadow-xl transition-shadow border-2 border-orange-500">
            <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Public Access
            </div>
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheck className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Verify Certificate
              </h2>
              <p className="text-gray-600 mb-6">
                Upload and verify product certificates instantly. Check authenticity 
                against blockchain records and view original documents.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                  <span>Upload certificate for verification</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                  <span>Blockchain authenticity check</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                  <span>View original certificate from Firebase</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                  <span>No login required</span>
                </li>
              </ul>
              <Button
                onClick={() => navigate("/verify-certificate")}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
              >
                Verify Certificate
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Need help choosing?{" "}
            <a href="/contact" className="text-green-600 hover:text-green-700 font-semibold">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
