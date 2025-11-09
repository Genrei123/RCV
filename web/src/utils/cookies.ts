/**
 * Cookie utility functions for managing authentication and user data
 * Uses native browser APIs without external dependencies
 */

interface CookieOptions {
  days?: number; // Expiration in days
  path?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export class CookieManager {
  static setCookie(name: string, value: string, options: CookieOptions = {}): void {
    const {
      days = 7,
      path = '/',
      secure = window.location.protocol === 'https:',
      sameSite = 'Lax'
    } = options;

    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      cookieString += `; expires=${date.toUTCString()}`;
    }

    cookieString += `; path=${path}`;

    if (secure) {
      cookieString += '; secure';
    }

    cookieString += `; SameSite=${sameSite}`;

    document.cookie = cookieString;
  }

  static getCookie(name: string): string | null {
    const nameEQ = encodeURIComponent(name) + '=';
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }

    return null;
  }

  static deleteCookie(name: string, path: string = '/'): void {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
  }

  static hasCookie(name: string): boolean {
    return this.getCookie(name) !== null;
  }

  static clearAuthCookies(): void {
    this.deleteCookie('token');
    this.deleteCookie('tokenExpiration');
    this.deleteCookie('rememberMe');
    this.deleteCookie('pendingApprovalEmail');
  }

  static setAuthToken(token: string, rememberMe: boolean = false): void {
    const days = rememberMe ? 30 : 1; // 30 days if remember me, 1 day otherwise
    const expirationTime = Date.now() + (days * 24 * 60 * 60 * 1000);

    this.setCookie('token', token, { days });
    this.setCookie('tokenExpiration', expirationTime.toString(), { days });

    if (rememberMe) {
      this.setCookie('rememberMe', 'true', { days: 30 });
    }
  }

  static getAuthToken(): string | null {
    return this.getCookie('token');
  }

  static isTokenExpired(): boolean {
    const tokenExpiration = this.getCookie('tokenExpiration');
    
    if (!tokenExpiration) {
      return true;
    }

    const expirationTime = parseInt(tokenExpiration);
    const currentTime = Date.now();

    return currentTime > expirationTime;
  }

  static getTokenExpirationInfo(): {
    expirationTime: number;
    remainingTime: number;
    isExpired: boolean;
    rememberMe: boolean;
  } | null {
    const tokenExpiration = this.getCookie('tokenExpiration');
    const rememberMe = this.getCookie('rememberMe');

    if (!tokenExpiration) {
      return null;
    }

    const expirationTime = parseInt(tokenExpiration);
    const currentTime = Date.now();
    const remainingTime = expirationTime - currentTime;

    return {
      expirationTime,
      remainingTime,
      isExpired: remainingTime <= 0,
      rememberMe: rememberMe === 'true'
    };
  }
}
