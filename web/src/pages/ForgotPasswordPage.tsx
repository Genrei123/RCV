import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Key } from 'lucide-react';
import { AuthService } from '@/services/authService';

const RESET_STEPS = {
  EMAIL: 'email',
  VERIFY: 'verify',
  RESET: 'reset',
  SUCCESS: 'success'
} as const;

type ResetStep = typeof RESET_STEPS[keyof typeof RESET_STEPS];

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function ForgotPasswordPage() {
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

  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-error-500' };
    if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 5) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-primary-500' };
  };

  const validatePassword = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
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
      await AuthService.requestPasswordReset(email);
      
      setSuccessMessage(`Reset code sent to ${email}. Please check your inbox.`);
      setCurrentStep(RESET_STEPS.VERIFY);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
      console.error('Password reset request error:', err);
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
      const isValid = await AuthService.verifyResetCode(email, resetCode);
      
      if (isValid) {
        setCurrentStep(RESET_STEPS.RESET);
      } else {
        setError('Invalid or expired reset code. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify code. Please try again.');
      console.error('Code verification error:', err);
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
      await AuthService.resetPassword(email, resetCode, newPassword);
      
      setCurrentStep(RESET_STEPS.SUCCESS);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);

    try {
      await AuthService.requestPasswordReset(email);
      setSuccessMessage('Reset code resent successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const renderEmailStep = () => (
    <form onSubmit={handleSendResetEmail} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Forgot Password?</h2>
        <p className="text-neutral-600">
          Enter your email address and we'll send you a code to reset your password.
        </p>
      </div>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-primary hover:bg-[#00B087] text-white font-semibold"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending Code...
          </div>
        ) : (
          'Send Reset Code'
        )}
      </Button>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Key className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Verify Code</h2>
        <p className="text-neutral-600">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
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
        className="w-full h-11 bg-primary hover:bg-[#00B087] text-white font-semibold"
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
        <p className="text-sm text-neutral-600">
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="text-primary hover:text-[#00B087] font-semibold"
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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Set New Password</h2>
        <p className="text-neutral-600">
          Create a strong password for your account
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            className="pl-10 pr-10 h-11"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {newPassword && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-neutral-600">{passwordStrength.label}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            className="pl-10 pr-10 h-11"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {confirmPassword && newPassword === confirmPassword && (
          <div className="flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            <span className="text-xs text-primary-600">Passwords match</span>
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-primary hover:bg-[#00B087] text-white font-semibold"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Resetting Password...
          </div>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-4">
        <CheckCircle2 className="w-12 h-12 text-primary-600" />
      </div>
      <h2 className="text-2xl font-bold text-primary">Password Reset Successful!</h2>
      <p className="text-neutral-600">
        Your password has been successfully reset. You can now log in with your new password.
      </p>
      <Button
        onClick={() => navigate('/login')}
        className="w-full h-11 bg-primary hover:bg-[#00B087] text-white font-semibold"
      >
        Back to Login
      </Button>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl bg-white">
        {/* Back Button */}
        {currentStep !== RESET_STEPS.SUCCESS && (
          <button
            onClick={() => {
              if (currentStep === RESET_STEPS.EMAIL) {
                navigate('/login');
              } else if (currentStep === RESET_STEPS.VERIFY) {
                setCurrentStep(RESET_STEPS.EMAIL);
              } else if (currentStep === RESET_STEPS.RESET) {
                setCurrentStep(RESET_STEPS.VERIFY);
              }
            }}
            className="flex items-center gap-2 text-neutral-600 hover:text-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
            <p className="text-error-600 text-sm flex-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-primary-600 text-sm flex-1">{successMessage}</p>
          </div>
        )}

        {/* Step Progress Indicator */}
        {currentStep !== RESET_STEPS.SUCCESS && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[RESET_STEPS.EMAIL, RESET_STEPS.VERIFY, RESET_STEPS.RESET].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === step
                      ? 'bg-primary text-white'
                      : Object.values(RESET_STEPS).indexOf(currentStep) > index
                      ? 'bg-primary-100 text-primary'
                      : 'bg-neutral-200 text-neutral-400'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`w-12 h-1 mx-1 ${
                      Object.values(RESET_STEPS).indexOf(currentStep) > index
                        ? 'bg-primary'
                        : 'bg-neutral-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Render Current Step */}
        {currentStep === RESET_STEPS.EMAIL && renderEmailStep()}
        {currentStep === RESET_STEPS.VERIFY && renderVerifyStep()}
        {currentStep === RESET_STEPS.RESET && renderResetStep()}
        {currentStep === RESET_STEPS.SUCCESS && renderSuccessStep()}
      </Card>
    </div>
  );
}
