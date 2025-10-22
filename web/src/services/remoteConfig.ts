interface RemoteConfigParameter {
  key: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number';
  description?: string;
}

export class RemoteConfigService {
  private static baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3001';

  static async getAllParameters(): Promise<RemoteConfigParameter[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/firebase/getConfig`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache' // Prevent browser caching
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // The API returns { parameters: [...] }
      const parameters = data.parameters || [];
      
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
      const response = await fetch(`${this.baseURL}/api/v1/firebase/publishConfig`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Remote Config published:', data);
      
    } catch (error) {
      console.error('Failed to publish Remote Config:', error);
      throw error;
    }
  }
}