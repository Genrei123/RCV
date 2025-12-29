import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Key } from 'lucide-react';
import { CompanyOwnerService } from '@/services/companyOwnerService';
import { toast, ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

const RESET_STEPS = {
  EMAIL: 'email',
  VERIFY: 'verify',
  RESET: 'reset',
  SUCCESS: 'success'
} as const;

type ResetStep = typeof RESET_STEPS[keyof typeof RESET_STEPS];

export function CompanyForgotPasswordPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ResetStep>(RESET_STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await CompanyOwnerService.forgotPassword(email);
      
      setSuccessMessage(`Reset code sent to ${email}. Please check your inbox.`);
      setCurrentStep(RESET_STEPS.VERIFY);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resetCode || resetCode.length < 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const isValid = await CompanyOwnerService.verifyResetCode(email, resetCode);
      
      if (isValid) {
        setCurrentStep(RESET_STEPS.RESET);
      } else {
        setError('Invalid or expired reset code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await CompanyOwnerService.resetPassword(email, resetCode, newPassword);
      
      setCurrentStep(RESET_STEPS.SUCCESS);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);

    try {
      await CompanyOwnerService.forgotPassword(email);
      setSuccessMessage('Reset code resent successfully!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendResetEmail} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Forgot Password?</h2>
        <p className="text-gray-600">
          Enter your company email and we'll send you a code to reset your password.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="email"
            placeholder="owner@company.com"
            className="pl-10 h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending...
          </div>
        ) : (
          'Send Reset Code'
        )}
      </Button>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{' '}
          <button
            type="button"
            onClick={() => navigate('/company/login')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Back to Login
          </button>
        </p>
      </div>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Enter Reset Code</h2>
        <p className="text-gray-600">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reset Code
        </label>
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          className="h-11 text-center text-2xl tracking-widest"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
        disabled={loading || resetCode.length !== 6}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Verifying...
          </div>
        ) : (
          'Verify Code'
        )}
      </Button>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Resend Code
          </button>
        </p>
      </div>
    </form>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Set New Password</h2>
        <p className="text-gray-600">
          Create a strong password for your company account
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            className="pl-10 pr-10 h-11"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          At least 8 characters with uppercase, lowercase, and number
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            className="pl-10 pr-10 h-11"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Resetting...
          </div>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-green-900 mb-2">Password Reset Successfully!</h2>
        <p className="text-gray-600 mb-6">
          Your company password has been reset. You can now log in with your new password.
        </p>
      </div>
      <Button
        onClick={() => navigate('/company/login')}
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
      >
        Go to Login
      </Button>
    </div>
  );

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

      <Card className="w-full max-w-md p-8 shadow-2xl bg-white">
        {currentStep !== RESET_STEPS.SUCCESS && currentStep !== RESET_STEPS.EMAIL && (
          <button
            onClick={() => {
              if (currentStep === RESET_STEPS.VERIFY) {
                setCurrentStep(RESET_STEPS.EMAIL);
              } else if (currentStep === RESET_STEPS.RESET) {
                setCurrentStep(RESET_STEPS.VERIFY);
              }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm flex-1">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-600 text-sm flex-1">{successMessage}</p>
          </div>
        )}

        {currentStep === RESET_STEPS.EMAIL && renderEmailStep()}
        {currentStep === RESET_STEPS.VERIFY && renderVerifyStep()}
        {currentStep === RESET_STEPS.RESET && renderResetStep()}
        {currentStep === RESET_STEPS.SUCCESS && renderSuccessStep()}
      </Card>
    </div>
  );
}
