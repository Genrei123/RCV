// =========================================================================
// ADD COMPANY MODAL
// =========================================================================
// Modal component for adding new companies to the system with:
// - Form validation
// - Error handling
// - Integration with CompanyService
// =========================================================================

import { useState } from 'react';
import { X, Building2, MapPin, FileText, AlertCircle, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CompanyService, type CreateCompanyRequest } from '@/services/companyService';
import { PDFGenerationService } from '@/services/pdfGenerationService';
import type { Company } from '@/typeorm/entities/company.entity';
import { toast } from 'react-toastify';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  address: string;
  licenseNumber: string;
}

interface FormErrors {
  name?: string;
  address?: string;
  licenseNumber?: string;
}

export function AddCompanyModal({ isOpen, onClose, onSuccess }: AddCompanyModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    licenseNumber: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Company name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'This information is too long';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    } else if (formData.address.trim().length > 100) {
      newErrors.address = 'This information is too long';
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    } else if (formData.licenseNumber.trim().length < 3) {
      newErrors.licenseNumber = 'License number must be at least 3 characters';
    } else if (formData.licenseNumber.trim().length > 50) {
      newErrors.licenseNumber = 'This information is too long';
    }

    setErrors(newErrors);

    const fieldLabelMap: Record<string, string> = {
      name: 'Company Name',
      address: 'Address',
      licenseNumber: 'License Number',
    };
    const fields = Object.keys(newErrors).map((k) => fieldLabelMap[k] || k);
    if (fields.length > 0) {
      toast.error(`Please fix: ${fields.join(', ')}`, { toastId: 'validation-error' });
    } else {
      toast.dismiss('validation-error');
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const companyData: CreateCompanyRequest = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        licenseNumber: formData.licenseNumber.trim()
      };

      const result = await CompanyService.createCompany(companyData);
      
      // Show success screen with certificate download option
      setCreatedCompany(result.company);
      setShowSuccessScreen(true);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          'Failed to create company. Please try again.';
      setApiError(errorMessage);
      console.error('Error creating company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!createdCompany) return;
    
    try {
      toast.info('Generating certificate PDF...', { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadCompanyCertificate(createdCompany);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

  const handleFinalClose = () => {
    // Reset everything
    setFormData({
      name: '',
      address: '',
      licenseNumber: ''
    });
    setErrors({});
    setApiError('');
    setShowSuccessScreen(false);
    setCreatedCompany(null);
    
    // Call parent success handler and close
    onSuccess();
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    // Dismiss validation toast on user input
    toast.dismiss('validation-error');
    
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  const handleClose = () => {
    if (!loading && !showSuccessScreen) {
      setFormData({
        name: '',
        address: '',
        licenseNumber: ''
      });
      setErrors({});
      setApiError('');
      setShowSuccessScreen(false);
      setCreatedCompany(null);
      onClose();
    }
  };

  // Success Screen
  if (showSuccessScreen && createdCompany) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Company Created Successfully!</h2>
                <p className="text-sm text-gray-500">Your company has been registered</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Company Name:</span> {createdCompany.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">License Number:</span> {createdCompany.licenseNumber}
              </p>
            </div>

            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm text-teal-800">
                <strong>Download your company registration certificate</strong> - This document contains
                a QR code for easy verification and includes all company details.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t space-y-3">
            <Button
              onClick={handleDownloadCertificate}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </Button>
            <Button
              onClick={handleFinalClose}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Building2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Company</h2>
              <p className="text-sm text-gray-500">Register a new company in the system</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* API Error Alert */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Acme Corporation"
                className={`pl-10 ${errors.name ? '!border-red-500 !ring-1 !ring-red-200' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g., 123 Business St, Manila"
                className={`pl-10 ${errors.address ? '!border-red-500 !ring-1 !ring-red-200' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* License Number */}
          <div className="space-y-2">
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
              License Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="e.g., LIC-2024-001"
                className={`pl-10 ${errors.licenseNumber ? '!border-red-500 !ring-1 !ring-red-200' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.licenseNumber && (
              <p className="text-sm text-red-600">{errors.licenseNumber}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
