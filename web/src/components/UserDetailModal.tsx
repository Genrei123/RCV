import { X, User as UserIcon, Mail, Phone, MapPin, Calendar, Hash, Shield, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { User } from '@/typeorm/entities/user.entity'

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onApprove?: (user: User) => void
  onReject?: (user: User) => void
}

export function UserDetailModal({ isOpen, onClose, user, onApprove, onReject }: UserDetailModalProps) {
  if (!isOpen || !user) return null

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'N/A'
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      // Check if date is valid
      if (isNaN(dateObj.getTime())) return 'N/A'
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'N/A'
    }
  }

  const getFullName = (): string => {
    const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean)
    return parts.join(' ') || 'N/A'
  }

  const getRoleName = (role: 'AGENT' | 'ADMIN' | 'USER' | undefined): string => {
    if (!role) return 'N/A'
    return role.charAt(0) + role.slice(1).toLowerCase()
  }

  const getRoleBadgeVariant = (role: 'AGENT' | 'ADMIN' | 'USER' | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (role === 'ADMIN') return 'destructive' // Admin
    if (role === 'USER') return 'default' // User
    if (role === 'AGENT') return 'secondary' // Agent
    return 'outline'
  }

  const getStatusBadgeVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'Active') return 'default'
    if (status === 'Pending') return 'secondary'
    if (status === 'Inactive') return 'destructive'
    return 'outline'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <UserIcon className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <p className="text-sm text-gray-500">View complete user information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium">{getFullName()}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(user.dateOfBirth)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Email Address</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{user.phoneNumber}</p>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{user.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Official Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Badge ID</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium">{user.badgeId}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{user._id || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Status</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 block mb-1">Role</label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-teal-600" />
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleName(user.role)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 block mb-1">Status</label>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status || 'N/A'}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 block mb-1">Approval Status</label>
                    <div className="flex items-center gap-2">
                      {user.approved ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                            Approved
                          </Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-amber-600" />
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Pending
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Timestamps */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Account Created</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(user.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {onApprove && onReject && (
            <div className="pt-6 border-t mt-6">
              {!user.approved ? (
                <>
                  {/* Pending Approval Section */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800">
                      This user account is pending approval. Review the information above and take action below.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => onReject(user)}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject User
                    </Button>
                    <Button
                      onClick={() => onApprove(user)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve User
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Already Approved Section */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      This user account is approved and has access to the system.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => onReject(user)}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Revoke Access
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-6 border-t mt-6">
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
