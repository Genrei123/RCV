import { createClient } from 'redis';
import CustomError from '../utils/CustomError';

class RedisService {
  private client;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
    });
  }

  async connect() {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      // Silent fail
    }
  }

  async get(key: string): Promise<any> {
    try {
      if (!this.isConnected) await this.connect();
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      );
      
      const dataPromise = this.client.get(key);
      const data = await Promise.race([dataPromise, timeoutPromise]);
      
      return data ? JSON.parse(data as string) : null;
    } catch (error: any) {
      throw new CustomError(503, "Redis get operation failed", {
        key,
        error: error.message
      });
    }
  }

  async set(key: string, data: any, ttl: number = 300): Promise<boolean> {
    try {
      if (!this.isConnected) await this.connect();
      
      // Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      );
      
      const setPromise = this.client.setEx(key, ttl, JSON.stringify(data));
      await Promise.race([setPromise, timeoutPromise]);
      
      return true;
    } catch (error: any) {
      throw new CustomError(503, "Redis set operation failed", {
        key,
        ttl,
        error: error.message
      });
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) await this.connect();
      await this.client.del(key);
      return true;
    } catch (error: any) {
      throw new CustomError(503, "Redis delete operation failed", {
        key,
        error: error.message
      });
    }
  }

  async delPattern(pattern: string): Promise<boolean> {
    try {
      if (!this.isConnected) await this.connect();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error: any) {
      throw new CustomError(503, "Redis pattern delete operation failed", {
        pattern,
        error: error.message
      });
    }
  }

  // Company cache methods
  generateCompanyKey(page: number, limit: number, search?: string): string {
    const searchKey = search ? `_search_${search}` : '';
    return `companies_page_${page}_limit_${limit}${searchKey}`;
  }

  async getCachedCompanies(page: number, limit: number, search?: string) {
    const key = this.generateCompanyKey(page, limit, search);
    return await this.get(key);
  }

  async setCachedCompanies(page: number, limit: number, data: any, search?: string, ttl: number = 300) {
    const key = this.generateCompanyKey(page, limit, search);
    return await this.set(key, data, ttl);
  }

  async invalidateCompaniesCache() {
    return await this.delPattern('companies_*');
  }

  // Product cache methods
  generateProductKey(page: number, limit: number, search?: string): string {
    const searchKey = search ? `_search_${search}` : '';
    return `products_page_${page}_limit_${limit}${searchKey}`;
  }

  async getCachedProducts(page: number, limit: number, search?: string) {
    const key = this.generateProductKey(page, limit, search);
    return await this.get(key);
  }

  async setCachedProducts(page: number, limit: number, data: any, search?: string, ttl: number = 300) {
    const key = this.generateProductKey(page, limit, search);
    return await this.set(key, data, ttl);
  }

  async invalidateProductsCache() {
    return await this.delPattern('products_*');
  }
}

export const redisService = new RedisService();