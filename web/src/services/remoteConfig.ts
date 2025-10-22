import { remoteConfig } from '../lib/firebase';
import { 
  fetchAndActivate, 
  getValue, 
  getAll
} from 'firebase/remote-config';

interface RemoteConfigParameter {
  key: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number';
  description?: string;
}

export class RemoteConfigService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Fetch and activate the latest Remote Config values
      await fetchAndActivate(remoteConfig);
      this.initialized = true;
      
      console.log('Remote Config initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Remote Config:', error);
      throw error;
    }
  }

  static async refreshConfig(): Promise<void> {
    try {
      await fetchAndActivate(remoteConfig);
      console.log('Remote Config refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh Remote Config:', error);
      throw error;
    }
  }

  static async getAllParameters(): Promise<RemoteConfigParameter[]> {
    try {
      await this.initialize();
      const allValues = getAll(remoteConfig);
      
      const parameters: RemoteConfigParameter[] = [];
      
      for (const [key, remoteValue] of Object.entries(allValues)) {
        const value = remoteValue.asString();
        let parsedValue: string | boolean | number = value;
        let type: 'string' | 'boolean' | 'number' = 'string';
        
        // Try to determine the type and parse the value
        if (value === 'true' || value === 'false') {
          parsedValue = value === 'true';
          type = 'boolean';
        } else if (!isNaN(Number(value)) && value !== '') {
          parsedValue = Number(value);
          type = 'number';
        }
        
        parameters.push({
          key,
          value: parsedValue,
          type,
          description: this.getParameterDescription(key)
        });
      }
      
      return parameters;
    } catch (error) {
      console.error('Failed to get all parameters:', error);
      throw error;
    }
  }

  // Convenience methods for getting specific parameter types
  static async getParameterAsString(key: string): Promise<string> {
    await this.initialize();
    return getValue(remoteConfig, key).asString();
  }

  static async getParameterAsBoolean(key: string): Promise<boolean> {
    await this.initialize();
    return getValue(remoteConfig, key).asBoolean();
  }

  static async getParameterAsNumber(key: string): Promise<number> {
    await this.initialize();
    return getValue(remoteConfig, key).asNumber();
  }

  // Helper method for parameter descriptions
  private static getParameterDescription(key: string): string {
    const descriptions: { [key: string]: string } = {
      disable_application: 'Controls whether the mobile app should be disabled',
      maintenance_message: 'Message shown to users when app is disabled',
      app_version_requirement: 'Minimum app version required to use the app',
      feature_flags: 'JSON object containing feature flag settings'
    };
    
    return descriptions[key] || 'Custom parameter';
  }

  // Note: Updates must be done through Firebase Console or backend API
  // This is just a placeholder for future backend integration
  static async updateParameter(key: string, value: string | boolean | number): Promise<void> {
    console.warn('Remote Config updates from web client require backend implementation.');
    console.log(`Would update ${key} to ${value}`);
    
    // Here you would call your backend API that uses Firebase Admin SDK
    // Example:
    // await fetch('/api/remote-config/update', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ key, value })
    // });
    
    throw new Error('Remote Config updates require backend implementation with Admin SDK');
  }
}