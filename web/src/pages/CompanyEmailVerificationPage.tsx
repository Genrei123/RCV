import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { CompanyOwnerService } from "../services/companyOwnerService";
import { toast } from "react-toastify";

export function CompanyEmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await CompanyOwnerService.verifyEmail(token);
      
      // Update localStorage if the user is currently logged in
      const currentOwnerData = CompanyOwnerService.getCompanyOwnerData();
      if (currentOwnerData && response.companyOwner) {
        const updatedData = {
          ...currentOwnerData,
          emailVerified: true
        };
        localStorage.setItem('companyOwnerData', JSON.stringify(updatedData));
      }
      
      setStatus('success');
      setMessage(response.message || 'Email verified successfully!');
      toast.success('Email verified! You can now login.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Verification failed');
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Email...
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Email Verified!
                </h2>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <Button
                  onClick={() => navigate('/company/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Continue to Login
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/company/login')}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                  <Button
                    onClick={() => navigate('/company/register')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Register Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
