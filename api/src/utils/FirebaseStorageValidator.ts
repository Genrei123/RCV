/**
 * Firebase Storage URL Validator
 * 
 * Validates that URLs are legitimate Firebase Storage URLs from our bucket.
 * Prevents malicious URLs from being saved to the database.
 */

const ALLOWED_BUCKET = 'rcv-flutter.firebasestorage.app';
const FIREBASE_STORAGE_DOMAIN = 'firebasestorage.googleapis.com';

export class FirebaseStorageValidator {
  /**
   * Validate a Firebase Storage URL
   * 
   * Checks:
   * - URL is from Firebase Storage domain
   * - URL is from our specific bucket
   * - URL has proper format
   * 
   * @param url - The URL to validate
   * @param allowedPath - Optional path prefix to validate (e.g., 'avatars/', 'scans/')
   * @returns true if valid, false otherwise
   */
  static isValidUrl(url: string, allowedPath?: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Must be Firebase Storage URL
    if (!url.includes(FIREBASE_STORAGE_DOMAIN)) {
      return false;
    }

    // Must be from our bucket
    if (!url.includes(ALLOWED_BUCKET)) {
      return false;
    }

    // Must start with https
    if (!url.startsWith('https://')) {
      return false;
    }

    // If path is specified, validate it
    if (allowedPath) {
      const pathPattern = new RegExp(`/o/${encodeURIComponent(allowedPath)}|/${allowedPath}`);
      if (!pathPattern.test(url)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate avatar URL specifically
   * Must be from avatars/ folder
   */
  static isValidAvatarUrl(url: string): boolean {
    return this.isValidUrl(url, 'avatars/');
  }

  /**
   * Validate scan image URL specifically
   * Must be from scans/ folder
   */
  static isValidScanUrl(url: string): boolean {
    return this.isValidUrl(url, 'scans/');
  }

  /**
   * Validate file type from URL
   * Checks if URL contains expected file extensions
   */
  static hasValidImageExtension(url: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    return validExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Full validation for avatar URL
   * Combines all checks
   */
  static validateAvatarUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'Avatar URL is required' };
    }

    if (!this.isValidUrl(url)) {
      return { valid: false, error: 'Invalid Firebase Storage URL' };
    }

    if (!this.isValidAvatarUrl(url)) {
      return { valid: false, error: 'Avatar must be uploaded to avatars/ folder' };
    }

    if (!this.hasValidImageExtension(url)) {
      return { valid: false, error: 'Avatar URL must point to an image file' };
    }

    return { valid: true };
  }

  /**
   * Full validation for scan image URLs
   */
  static validateScanUrls(
    frontUrl?: string, 
    backUrl?: string
  ): { valid: boolean; error?: string } {
    // At least one URL must be provided
    if (!frontUrl && !backUrl) {
      return { valid: false, error: 'At least one scan image is required' };
    }

    // Validate front URL if provided
    if (frontUrl) {
      if (!this.isValidUrl(frontUrl)) {
        return { valid: false, error: 'Invalid Firebase Storage URL for front image' };
      }

      if (!this.isValidScanUrl(frontUrl)) {
        return { valid: false, error: 'Front image must be uploaded to scans/ folder' };
      }

      if (!this.hasValidImageExtension(frontUrl)) {
        return { valid: false, error: 'Front image URL must point to an image file' };
      }
    }

    // Validate back URL if provided
    if (backUrl) {
      if (!this.isValidUrl(backUrl)) {
        return { valid: false, error: 'Invalid Firebase Storage URL for back image' };
      }

      if (!this.isValidScanUrl(backUrl)) {
        return { valid: false, error: 'Back image must be uploaded to scans/ folder' };
      }

      if (!this.hasValidImageExtension(backUrl)) {
        return { valid: false, error: 'Back image URL must point to an image file' };
      }
    }

    return { valid: true };
  }

  /**
   * Extract file path from Firebase Storage URL
   * Useful for logging and debugging
   */
  static extractFilePath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
      return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
    } catch {
      return null;
    }
  }
}
