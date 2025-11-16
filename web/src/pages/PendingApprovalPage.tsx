import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CookieManager } from "@/utils/cookies";

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    // Get email from navigation state or cookies
    const email =
      location.state?.email ||
      CookieManager.getCookie("pendingApprovalEmail") ||
      "";
    setUserEmail(email);

    // Clear any existing tokens since user is not approved
    CookieManager.deleteCookie("token");
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 shadow-2xl bg-white">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-amber-600" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Account Pending Approval
            </h1>
            <p className="text-lg text-neutral-600">
              Your registration was successful!
            </p>
          </div>

          {/* Email Display */}
          {userEmail && (
            <div className="bg-neutral-50 rounded-lg p-4 flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-neutral-700">{userEmail}</span>
            </div>
          )}

          {/* Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">
                  Waiting for Administrator Approval
                </h3>
                <p className="text-amber-800 leading-relaxed">
                  Your account has been created successfully and is currently
                  pending approval from an administrator. This is a security
                  measure to ensure only authorized personnel can access the RCV
                  System.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  What Happens Next?
                </h3>
                <ul className="text-neutral-700 space-y-2 list-disc list-inside">
                  <li>An administrator will review your registration</li>
                  <li>
                    You will receive a notification once your account is
                    approved
                  </li>
                  <li>You can then log in and access the system</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-accent-800">
              <strong>Note:</strong> This process typically takes 24-48 hours.
              If you haven't received approval after 2 business days, please
              contact your administrator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary-light"
              onClick={() => {
                localStorage.removeItem("pendingApprovalEmail");
                navigate("/login");
              }}
            >
              Understood
            </Button>
          </div>

          {/* Support Info */}
          <div className="pt-6 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Need help? Contact your system administrator or IT support team.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
