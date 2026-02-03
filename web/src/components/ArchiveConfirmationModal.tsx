import { Building2, X, AlertTriangle, Archive, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface ArchiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entity: {
    name: string;
    licenseNumber?: string;
    _id: string;
  } | null;
  entityType: "company" | "product";
  action: "archive" | "restore";
  loading?: boolean;
}

export function ArchiveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  entity,
  entityType,
  action,
  loading = false
}: ArchiveConfirmationModalProps) {
  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const html = document.documentElement;
      const body = document.body;
      const scrollY = window.scrollY;
      
      // Store original styles
      const originalHtmlOverflow = html.style.overflow;
      const originalBodyOverflow = body.style.overflow;
      const originalBodyPosition = body.style.position;
      
      // Apply scroll lock
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      
      return () => {
        // Restore original styles
        html.style.overflow = originalHtmlOverflow;
        body.style.overflow = originalBodyOverflow;
        body.style.position = originalBodyPosition;
        body.style.top = '';
        body.style.width = '';
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !entity) return null;

  const isArchiving = action === "archive";
  const actionText = isArchiving ? "Archive" : "Restore";

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full shadow-sm ${
              isArchiving 
                ? 'bg-green-50 border border-green-100' 
                : 'bg-green-50 border border-green-100'
            }`}>
              <AlertTriangle className={`h-6 w-6 ${
                isArchiving 
                  ? 'app-text-primary' 
                  : 'app-text-success'
              }`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {actionText} {entityType === "company" ? "Company" : "Product"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {isArchiving ? "Move to archived section" : "Restore to active section"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">
              {isArchiving 
                ? `Are you sure you want to archive "${entity.name}"? This action will move the ${entityType} to the archived section and it won't appear in the active ${entityType}s list.`
                : `Are you sure you want to restore "${entity.name}"? This action will move the ${entityType} back to the active section.`
              }
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 app-bg-primary rounded-lg shadow-sm">
                {entityType === "company" ? (
                  <Building2 className="h-5 w-5 text-white" />
                ) : (
                  <Package className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-lg">{entity.name}</p>
                {entity.licenseNumber && (
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    {entityType === "company" ? "License: " : "ID: "}{entity.licenseNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 cursor-pointer border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-3"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 cursor-pointer font-medium py-3 text-white shadow-sm transition-all ${
              isArchiving 
                ? 'app-bg-primary hover:opacity-90 focus:ring-2 focus:ring-green-200' 
                : 'app-bg-success hover:bg-green-600 focus:ring-green-200'
            } ${loading ? 'opacity-75' : ''}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isArchiving ? "Archiving..." : "Restoring..."}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {isArchiving ? (
                  <Archive className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>{actionText}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
