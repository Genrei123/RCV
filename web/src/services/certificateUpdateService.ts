import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface ProductUpdateData {
  LTONumber?: string;
  CFPRNumber?: string;
  lotNumber?: string;
  brandName?: string;
  productName?: string;
  productClassification?: string;
  productSubClassification?: string;
  expirationDate?: string;
  companyId?: string;
  productImageFront?: string;
  productImageBack?: string;
}

/**
 * Submit a product update for approval
 */
export const submitUpdate = async (
  productId: string,
  updateData: ProductUpdateData
): Promise<void> => {
  try {
    const response = await axios.post(
      `${API_URL}/certificate-approval/updateProduct`,
      {
        entityId: productId,
        updateData,
      },
      {
        withCredentials: true,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to submit update');
    }

    return response.data;
  } catch (error: any) {
    console.error('Error submitting product update:', error);
    throw error;
  }
};

export const CertificateUpdateService = {
  submitUpdate,
};
