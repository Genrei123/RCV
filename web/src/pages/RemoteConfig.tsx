import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RemoteConfigService } from '../services/remoteConfig';
import { Settings, Edit3, Save, X } from 'lucide-react';
import { toast } from 'react-toastify';

interface RemoteConfigParameter {
  key: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number';
  description?: string;
}

export function RemoteConfig() {
  const [publishedParameters, setPublishedParameters] = useState<RemoteConfigParameter[]>([]);
  const [draftParameters, setDraftParameters] = useState<RemoteConfigParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const location = useLocation();

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(publishedParameters) !== JSON.stringify(draftParameters);

  useEffect(() => {
    loadParameters();
  }, [location.pathname]);

  const loadParameters = async () => {
    try {
      setLoading(true);
      const params = await RemoteConfigService.getAllParameters();
      setPublishedParameters(params);
      setDraftParameters([...params]); // Create a copy for drafts
      setIsEditing(false);
    } catch (error) {
      console.error('Error loading Remote Config parameters:', error);
      toast.error('Failed to load Remote Config parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftParameters([...publishedParameters]); // Reset to published values
    setIsEditing(false);
  };

  const handleValueChange = (key: string, newValue: string | boolean | number) => {
    setDraftParameters(prev => 
      prev.map(param => 
        param.key === key ? { ...param, value: newValue } : param
      )
    );
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      await RemoteConfigService.publishConfig(draftParameters);
      setPublishedParameters([...draftParameters]);
      setIsEditing(false);
      toast.success('Remote Config published successfully!');
    } catch (error) {
      console.error('Error publishing Remote Config:', error);
      toast.error('Failed to publish Remote Config');
    } finally {
      setPublishing(false);
    }
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

  const renderValueInput = (param: RemoteConfigParameter) => {
    if (!isEditing) {
      return (
        <code className={`px-2 py-1 bg-gray-100 rounded text-sm font-mono ${getValueColor(param)}`}>
          {formatValue(param)}
        </code>
      );
    }

    // Editing mode
    switch (param.type) {
      case 'boolean':
        return (
          <select
            value={param.value.toString()}
            onChange={(e) => handleValueChange(param.key, e.target.value === 'true')}
            className="px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={param.value.toString()}
            onChange={(e) => handleValueChange(param.key, Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-32"
          />
        );
      default: // string
        return (
          <input
            type="text"
            value={param.value.toString()}
            onChange={(e) => handleValueChange(param.key, e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-w-48"
          />
        );
    }
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Configuration Parameters ({draftParameters.length})
                </h2>
                {hasChanges && (
                  <p className="text-sm text-orange-600 mt-1">You have unsaved changes</p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    
                    {hasChanges && (
                      <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {publishing ? (
                          <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {publishing ? 'Publishing...' : 'Publish Changes'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {draftParameters.length === 0 ? (
            <div className="p-12 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Parameters Found</h3>
              <p className="text-gray-600">
                No Remote Config parameters are currently configured.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {draftParameters.map((param) => {
                const isChanged = publishedParameters.find(p => p.key === param.key)?.value !== param.value;
                
                return (
                  <div key={param.key} className={`p-6 ${isChanged ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
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
                          {isChanged && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              Modified
                            </span>
                          )}
                        </div>
                        
                        {param.description && (
                          <p className="text-gray-600 text-sm mb-3">{param.description}</p>
                        )}
                        
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">Value:</span>
                          <div className="flex items-center gap-2">
                            {renderValueInput(param)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}