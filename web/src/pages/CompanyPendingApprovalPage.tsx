import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompanyPendingApprovalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-yellow-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Registration Pending
        </h1>

        <p className="text-gray-600 mb-8">
          Thank you for registering your company with RCV. Your application is currently under review by our administrators.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-800 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Our team will review your business permit and company details</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You'll receive an email notification once approved</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Approval typically takes 1-3 business days</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>

          <p className="text-sm text-gray-500">
            Need help?{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
