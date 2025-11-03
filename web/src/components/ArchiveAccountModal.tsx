import { X, AlertTriangle, Mail, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

interface ArchiveAccountModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  onConfirm: () => Promise<void>
}

export function ArchiveAccountModal({ isOpen, onClose, userEmail, onConfirm }: ArchiveAccountModalProps) {
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (emailInput.toLowerCase() !== userEmail.toLowerCase()) {
      setError('Email does not match your account email')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      await onConfirm()
      onClose()
      setEmailInput('')
    } catch (err) {
      setError('Failed to archive account. Please try again.')
      console.error('Archive error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmailInput('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Archive className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Archive Account</h2>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-2">Warning: Account Archive</p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>You will be immediately logged out</li>
                  <li>You will not be able to access your account</li>
                  <li>Your account will be marked as "Archived"</li>
                  <li>You will need to contact an admin to restore your account</li>
                  <li>All your data will be preserved but inaccessible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-3">
                To confirm archiving your account, please type your email address:
              </p>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value)
                      setError('')
                    }}
                    placeholder={userEmail}
                    className={`pl-10 ${error ? 'border-red-500' : ''}`}
                    disabled={loading}
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <strong>Your email:</strong> {userEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={loading || emailInput.toLowerCase() !== userEmail.toLowerCase()}
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Archiving...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive My Account
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
