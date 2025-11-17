import { apiClient } from "./axiosConfig";

interface RemoteConfigParameter {
  key: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number';
  description?: string;
}

export class RemoteConfigService {
  static async getAllParameters(): Promise<RemoteConfigParameter[]> {
    try {
      const data = (await apiClient.get('/firebase/getConfig'));
      
      // The API returns { parameters: [...] }
      const parameters = data.data?.parameters || [];
      
      // Return parameters as-is from the API
      return parameters;
      
    } catch (error) {
      console.error('Failed to get all parameters:', error);
      throw error;
    }
  }

  // Convenience methods for getting specific parameter types
  static async getParameterAsString(key: string): Promise<string> {
    const parameters = await this.getAllParameters();
    const param = parameters.find(p => p.key === key);
    return param ? String(param.value) : '';
  }

  static async getParameterAsBoolean(key: string): Promise<boolean> {
    const parameters = await this.getAllParameters();
    const param = parameters.find(p => p.key === key);
    return param ? Boolean(param.value) : false;
  }

  static async getParameterAsNumber(key: string): Promise<number> {
    const parameters = await this.getAllParameters();
    const param = parameters.find(p => p.key === key);
    return param ? Number(param.value) : 0;
  }



  // Publish Remote Config changes
  static async publishConfig(parameters: RemoteConfigParameter[]): Promise<void> {
    try {
      const response = await apiClient.post('/firebase/publishConfig', { parameters });
      console.log('Remote Config published:', response);
      
    } catch (error) {
      console.error('Failed to publish Remote Config:', error);
      throw error;
    }
  }
}