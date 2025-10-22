import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RemoteConfigService } from '../services/remoteConfig';
import { Settings, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

interface RemoteConfigParameter {
  key: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number';
  description?: string;
}

export function RemoteConfig() {
  const [parameters, setParameters] = useState<RemoteConfigParameter[]>([]);
  const [loading, setLoading] = useState(true);

  // etp yung sa eye thingy
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({});
  const location = useLocation();

  useEffect(() => {
    loadParameters();
  }, [location.pathname]);

  const loadParameters = async () => {
    try {
      setLoading(true);
      const params = await RemoteConfigService.getAllParameters();
      setParameters(params);
      
      // Initialize show/hide state for all parameters
      const initialShowState: { [key: string]: boolean } = {};
      params.forEach((param: RemoteConfigParameter) => {
        initialShowState[param.key] = false;
      });
      setShowValues(initialShowState);
      
    } catch (error) {
      console.error('Error loading Remote Config parameters:', error);
      toast.error('Failed to load Remote Config parameters');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatValue = (param: RemoteConfigParameter): string => {
    if (param.type === 'boolean') {
      return param.value ? 'true' : 'false';
    }
    return param.value.toString();
  };

  const getValueColor = (param: RemoteConfigParameter): string => {
    if (param.type === 'boolean') {
      return param.value ? 'text-green-600' : 'text-red-600';
    }
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Remote Config...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Parameters List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Configuration Parameters ({parameters.length})
            </h2>
          </div>
          
          {parameters.length === 0 ? (
            <div className="p-12 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Parameters Found</h3>
              <p className="text-gray-600">
                No Remote Config parameters are currently configured.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {parameters.map((param) => (
                <div key={param.key} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{param.key}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          param.type === 'boolean' ? 'bg-green-100 text-green-800' :
                          param.type === 'number' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {param.type}
                        </span>
                      </div>
                      
                      {param.description && (
                        <p className="text-gray-600 text-sm mb-3">{param.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Value:</span>
                        <div className="flex items-center gap-2">
                          <code className={`px-2 py-1 bg-gray-100 rounded text-sm font-mono ${getValueColor(param)}`}>
                            {formatValue(param)}

                            {/* "Palitan nalang netong naka comment if gagamitin yung eye para sa values" */}
                            {/*{showValues[param.key] ? formatValue(param) : '••••••••'}*/}
                          </code>
                          {/* <button
                            onClick={() => toggleShowValue(param.key)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title={showValues[param.key] ? 'Hide value' : 'Show value'}
                          >
                            {showValues[param.key] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button> */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}