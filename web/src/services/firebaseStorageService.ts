import { storage } from '@/utils/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';

/**
 * Service for managing file uploads to Firebase Storage
 */
export class FirebaseStorageService {
  /**
   * Get PDF download URL by certificate ID
   * 
   * @param certificateId - The certificate ID (e.g., 'CERT-COMP-xxx' or 'CERT-PROD-xxx')
   * @returns Download URL or null if not found
   */
  static async getPDFByCertificateId(certificateId: string): Promise<string | null> {
    try {
      // Determine the certificate type from the ID
      let certType: 'company' | 'product';
      if (certificateId.startsWith('CERT-COMP-')) {
        certType = 'company';
      } else if (certificateId.startsWith('CERT-PROD-')) {
        certType = 'product';
      } else {
        console.error('❌ [Storage] Invalid certificate ID format:', certificateId);
        return null;
      }

      const filePath = `certificates/${certType}/${certificateId}.pdf`;
      console.log('🔍 [Storage] Looking for PDF at:', filePath);
      
      const storageRef = ref(storage, filePath);
      const url = await getDownloadURL(storageRef);
      
      console.log('✅ [Storage] PDF found:', url);
      return url;
    } catch (error) {
      console.error('❌ [Storage] PDF not found for certificate:', certificateId, error);
      return null;
    }
  }

  /**
   * Upload PDF blob to Firebase Storage
   * 
   * @param pdf - The PDF blob to upload
   * @param filePath - The full path in storage (e.g., 'certificates/CERT-COMP-123.pdf')
   * @returns Download URL or null on failure
   */
  static async uploadPDFBlob(pdf: Blob, filePath: string): Promise<string | null> {
    try {
      // Check if storage bucket exists
      if (!storage) {
        console.error('❌ [Storage] Firebase Storage is not initialized.');
        return null;
      }

      console.log('📤 [Storage] Uploading PDF to:', filePath);
      
      const storageRef = ref(storage, filePath);
      
      // Upload with proper metadata
      const metadata = {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
        },
      };
      
      const snapshot = await uploadBytes(storageRef, pdf, metadata);
      const url = await getDownloadURL(snapshot.ref);
      
      console.log('✅ [Storage] PDF uploaded successfully:', url);
      return url;
    } catch (error) {
      console.error('❌ [Storage] PDF upload failed:', error);
      return null;
    }
  }
  /**
   * Upload profile avatar to Firebase Storage
   * 
   * @param userId - The user's ID
   * @param file - The image file to upload
   * @returns Download URL or null on failure
   * 
   * @example
   * ```ts
   * const url = await FirebaseStorageService.uploadAvatar('user123', imageFile);
   * if (url) {
   *   await updateUserProfile({ avatarUrl: url });
   * }
   * ```
   */
  static async uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
      console.log('📤 [Storage] Uploading avatar for user:', userId);
      
      const storageRef = ref(storage, `avatars/${userId}.jpg`);
      
      // Upload file with metadata
      const metadata = {
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snapshot.ref);
      
      console.log('✅ [Storage] Avatar uploaded successfully:', url);
      return url;
    } catch (error) {
      console.error('❌ [Storage] Avatar upload failed:', error);
      return null;
    }
  }

  /**
   * Upload scan images (front and back) to Firebase Storage
   * 
   * @param scanId - Unique identifier for this scan
   * @param frontImage - Front image file
   * @param backImage - Back image file
   * @returns Object with frontUrl and backUrl
   */
  static async uploadScanImages(
    scanId: string,
    frontImage: File,
    backImage: File
  ): Promise<{ frontUrl: string | null; backUrl: string | null }> {
    try {
      console.log('📤 [Storage] Uploading scan images for:', scanId);
      
      const frontRef = ref(storage, `scans/${scanId}/front.jpg`);
      const backRef = ref(storage, `scans/${scanId}/back.jpg`);
      
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          scanId,
          uploadedAt: new Date().toISOString(),
        },
      };
      
      // Upload both images in parallel
      const [frontSnapshot, backSnapshot] = await Promise.all([
        uploadBytes(frontRef, frontImage, metadata),
        uploadBytes(backRef, backImage, metadata),
      ]);
      
      // Get download URLs
      const [frontUrl, backUrl] = await Promise.all([
        getDownloadURL(frontSnapshot.ref),
        getDownloadURL(backSnapshot.ref),
      ]);
      
      console.log('✅ [Storage] Scan images uploaded successfully');
      return { frontUrl, backUrl };
    } catch (error) {
      console.error('❌ [Storage] Scan upload failed:', error);
      return { frontUrl: null, backUrl: null };
    }
  }

  /**
   * Delete user's avatar from Firebase Storage
   * 
   * @param userId - The user's ID
   * @returns true if deleted successfully
   */
  static async deleteAvatar(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ [Storage] Deleting avatar for user:', userId);
      
      const storageRef = ref(storage, `avatars/${userId}.jpg`);
      await deleteObject(storageRef);
      
      console.log('✅ [Storage] Avatar deleted successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ [Storage] Avatar delete failed (may not exist):', error);
      return false;
    }
  }

  /**
   * Delete scan images from Firebase Storage
   * 
   * @param scanId - The scan's ID
   * @returns true if deleted successfully
   */
  static async deleteScanImages(scanId: string): Promise<boolean> {
    try {
      console.log('🗑️ [Storage] Deleting scan images for:', scanId);
      
      const frontRef = ref(storage, `scans/${scanId}/front.jpg`);
      const backRef = ref(storage, `scans/${scanId}/back.jpg`);
      
      // Delete both images in parallel
      await Promise.all([
        deleteObject(frontRef),
        deleteObject(backRef),
      ]);
      
      console.log('✅ [Storage] Scan images deleted successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ [Storage] Scan delete failed:', error);
      return false;
    }
  }

  /**
   * Get download URL for an existing avatar
   * 
   * @param userId - The user's ID
   * @returns Download URL or null if not found
   */
  static async getAvatarUrl(userId: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, `avatars/${userId}.jpg`);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.warn('⚠️ [Storage] Avatar not found for user:', userId);
      return null;
    }
  }

  /**
   * Check if avatar exists for a user
   * 
   * @param userId - The user's ID
   * @returns true if avatar exists
   */
  static async avatarExists(userId: string): Promise<boolean> {
    try {
      const storageRef = ref(storage, `avatars/${userId}.jpg`);
      await getMetadata(storageRef);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert File to base64 data URL (for preview before upload)
   * 
   * @param file - The file to convert
   * @returns Promise that resolves to base64 data URL
   */
  static async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert base64 data URL to File object
   * 
   * @param dataUrl - Base64 data URL
   * @param filename - Name for the file
   * @returns File object
   */
  static dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Upload agent verification documents (ID and selfie)
   * 
   * @param file - The image file to upload
   * @param path - The path in storage (e.g., 'agent-verification/token/id-document')
   * @returns Object with downloadUrl
   */
  static async uploadAgentVerificationDocument(
    file: File,
    path: string
  ): Promise<{ downloadUrl: string }> {
    try {
      console.log('📤 [Storage] Uploading agent verification document to:', path);
      
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fullPath = `${path}.${fileExtension}`;
      const storageRef = ref(storage, fullPath);
      
      const metadata = {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          purpose: 'agent-verification',
        },
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('✅ [Storage] Agent verification document uploaded:', downloadUrl);
      return { downloadUrl };
    } catch (error) {
      console.error('❌ [Storage] Agent verification document upload failed:', error);
      throw new Error('Failed to upload verification document');
    }
  }

  /**
   * Upload company document (business permit, license, etc.)
   * 
   * @param companyId - The company's ID (can be temporary for new companies)
   * @param file - The document file to upload
   * @param documentType - Type of document (e.g., 'business-permit', 'license', 'certificate')
   * @returns Object with downloadUrl and metadata
   */
  static async uploadCompanyDocument(
    companyId: string,
    file: File,
    documentType: string
  ): Promise<{ downloadUrl: string; fileName: string; fileType: string }> {
    try {
      console.log('📤 [Storage] Uploading company document:', documentType, 'for company:', companyId);
      
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'pdf';
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fullPath = `companies/${companyId}/documents/${documentType}_${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, fullPath);
      
      const metadata = {
        contentType: file.type || 'application/pdf',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalName: sanitizedName,
          documentType: documentType,
          companyId: companyId,
        },
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('✅ [Storage] Company document uploaded:', downloadUrl);
      return { 
        downloadUrl, 
        fileName: sanitizedName,
        fileType: file.type || 'application/octet-stream'
      };
    } catch (error) {
      console.error('❌ [Storage] Company document upload failed:', error);
      throw new Error('Failed to upload company document');
    }
  }

  /**
   * Delete company document from Firebase Storage
   * 
   * @param documentUrl - The full URL of the document to delete
   * @returns true if deleted successfully
   */
  static async deleteCompanyDocument(documentUrl: string): Promise<boolean> {
    try {
      console.log('🗑️ [Storage] Deleting company document:', documentUrl);
      
      const storageRef = ref(storage, documentUrl);
      await deleteObject(storageRef);
      
      console.log('✅ [Storage] Company document deleted successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ [Storage] Company document delete failed:', error);
      return false;
    }
  }
}
