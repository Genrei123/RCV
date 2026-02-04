import { X, AlertTriangle, Archive, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface ArchiveInviteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invite: {
    email: string;
    badgeId?: string;
    _id: string;
  } | null;
  loading?: boolean;
}

export function ArchiveInviteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  invite,
  loading = false
}: ArchiveInviteConfirmationModalProps) {
  // Simple scroll lock that prevents jumping
  useEffect(() => {
    if (isOpen) {
      // Only apply scroll lock if not already applied by another modal
      const body = document.body;
      const isAlreadyLocked = body.style.overflow === 'hidden';
      
      if (!isAlreadyLocked) {
        // Store original overflow
        const originalOverflow = body.style.overflow;
        
        // Simple approach: just prevent scrolling without position changes
        body.style.overflow = 'hidden';
        
        // Store that we applied the lock
        body.dataset.archiveModalLock = 'true';
        
        return () => {
          // Only restore if we were the ones who applied the lock
          if (body.dataset.archiveModalLock === 'true') {
            body.style.overflow = originalOverflow;
            delete body.dataset.archiveModalLock;
          }
        };
      }
    }
  }, [isOpen]);

  if (!isOpen || !invite) return null;

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
            <div className="p-3 rounded-full shadow-sm bg-orange-50 border border-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Archive Invitation
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Move invitation to archived section
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
              Are you sure you want to archive this invitation? The invitation will be moved to the archived section and will no longer appear in the active invitations list.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-600 rounded-lg shadow-sm">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-lg">{invite.email}</p>
                {invite.badgeId && (
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    Badge ID: {invite.badgeId}
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
            className="flex-1 cursor-pointer font-medium py-3 text-white shadow-sm transition-all bg-orange-600 hover:bg-orange-700 focus:ring-orange-200"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Archiving...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Archive className="h-4 w-4" />
                <span>Archive Invitation</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
