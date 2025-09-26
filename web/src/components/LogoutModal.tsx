import { X, LogOut, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

export function LogoutModal({ isOpen, onClose, onConfirm, userName = "User" }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
                <p className="text-sm text-gray-600">Are you sure you want to sign out?</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              Hello <span className="font-medium">{userName}</span>,
            </p>
            <p className="text-gray-600 text-sm">
              You will be signed out of your account and redirected to the login page. 
              Any unsaved changes may be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={onConfirm}
              className="px-6 bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}