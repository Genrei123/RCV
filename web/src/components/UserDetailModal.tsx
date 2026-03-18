import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Image,
  Loader2,
  Wallet,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { UserPageService } from "@/services/userPageService";
import { MetaMaskService } from "@/services/metaMaskService";
import type { User } from "@/typeorm/entities/user.entity";

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUser?: User | null; // Add current user to check if they're admin
  onApprove?: (user: User) => void;
  onReject?: (user: User) => void;
  onRevoke?: (user: User) => void;
  onAccessUpdate?: (user: User) => void;
}

export function UserDetailModal({
  isOpen,
  onClose,
  user,
  currentUser,
  onApprove,
  onReject,
  onRevoke,
  onAccessUpdate,
}: UserDetailModalProps) {
  const navigate = useNavigate();
  
  // Wallet management state
  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [authorizeWallet, setAuthorizeWallet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Promotion state
  const [promotionLoading, setPromotionLoading] = useState(false);
  
  // Demotion state
  const [demotionLoading, setDemotionLoading] = useState(false);

  // Archive/Delete/Unreject/Revoke state (Super Admin)
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [unrejectLoading, setUnrejectLoading] = useState(false);
  const [revokeRestoreLoading, setRevokeRestoreLoading] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    variant?: 'warning' | 'danger';
    requireEmailConfirm?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
  });
  const [emailConfirmInput, setEmailConfirmInput] = useState('');

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setWalletAddress(user.walletAddress || "");
      setAuthorizeWallet(user.walletAuthorized ?? false);
    }
  }, [user?._id, user?.walletAddress, user?.walletAuthorized]);

  // Disable background scroll when modal is open (match AddAgentModal behavior)
  useEffect(() => {
    if (isOpen) {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      const previousBodyPosition = body.style.position;
      const scrollY = window.scrollY;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.top = `-${scrollY}px`;

      return () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.position = previousBodyPosition;
        body.style.width = "";
        body.style.top = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  // Check if user is rejected or revoked - these users have no access and cannot be modified
  const isRejected = user.status === "Rejected";
  const isRevoked = user.status === "Revoked";

  // Copy wallet address to clipboard
  const handleCopyWallet = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Wallet address copied to clipboard");
    }
  };

  // Update user wallet address
  const handleUpdateWallet = async () => {
    if (!user?._id) return;
    
    // Validate wallet address format if provided
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast.error("Invalid wallet address format. Must be a valid Ethereum address.");
      return;
    }

    setWalletLoading(true);
    try {
      const result = await MetaMaskService.updateUserWallet(
        user._id,
        walletAddress,
        authorizeWallet
      );
      
      if (result.success) {
        toast.success(
          authorizeWallet 
            ? "Wallet updated and authorized for blockchain operations" 
            : "Wallet address updated successfully"
        );
        // Update parent with new data
        onAccessUpdate?.({ 
          ...user, 
          walletAddress: walletAddress || undefined,
          walletAuthorized: result.data?.walletAuthorized ?? authorizeWallet
        });
      } else {
        toast.error(result.error || "Failed to update wallet");
      }
    } catch (error) {
      console.error("Error updating wallet:", error);
      toast.error("Failed to update wallet address");
    } finally {
      setWalletLoading(false);
    }
  };

  const handleViewProfileAndActivities = () => {
    if (!user?._id) {
      toast.error("User ID is missing");
      return;
    }
    console.log("🔍 Navigating to user profile for ID:", user._id);
    navigate(`/users/${user._id}`, {
      state: {
        userHint: {
          id: user._id,
          name: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          role: user.role,
          badgeId: user.badgeId,
          location: { address: user.location },
        },
      },
    });
    onClose();
  };

  // Handle promotion of agent to admin
  const handlePromoteToAdmin = async () => {
    if (!user?._id) return;

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Promote to Admin',
      message: `Are you sure you want to promote ${user.fullName} to admin? This user will have full administrative privileges.`,
      confirmText: 'Promote',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        await executePromoteToAdmin();
      },
    });
  };

  const executePromoteToAdmin = async () => {
    if (!user?._id) return;

    setPromotionLoading(true);
    try {
      const result = await UserPageService.promoteAgentToAdmin(user._id);
      
      if (result.success) {
        toast.success(`${user.fullName} has been successfully promoted to admin`);
        // Update parent with new role
        onAccessUpdate?.({ 
          ...user, 
          role: 'ADMIN'
        });
      } else {
        toast.error(result.message || "Failed to promote agent to admin");
      }
    } catch (error) {
      console.error("Error promoting agent to admin:", error);
      toast.error("Failed to promote agent to admin");
    } finally {
      setPromotionLoading(false);
    }
  };

  // Handle demotion of admin to agent
  const handleDemoteAdminToAgent = async () => {
    if (!user?._id) return;

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Demote to Agent',
      message: `Are you sure you want to demote ${user.fullName} from admin to agent? This user will lose administrative privileges.`,
      confirmText: 'Demote',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        await executeDemoteAdminToAgent();
      },
    });
  };

  const executeDemoteAdminToAgent = async () => {
    if (!user?._id) return;

    setDemotionLoading(true);
    try {
      const result = await UserPageService.demoteAdminToAgent(user._id);
      
      if (result.success) {
        toast.success(`${user.fullName} has been successfully demoted to agent`);
        // Update parent with new role
        onAccessUpdate?.({ 
          ...user, 
          role: 'AGENT'
        });
      } else {
        toast.error(result.message || "Failed to demote admin to agent");
      }
    } catch (error) {
      console.error("Error demoting admin to agent:", error);
      toast.error("Failed to demote admin to agent");
    } finally {
      setDemotionLoading(false);
    }
  };

  // Handle revoke user access (Admin/Super Admin)
  const handleRevokeUser = async () => {
    if (!user?._id) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Revoke User Access',
      message: `Are you sure you want to revoke ${user.fullName}'s access? This will immediately disable their access to the system. Super Admin can restore their access later.`,
      confirmText: 'Revoke',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        if (onRevoke) {
          onRevoke(user);
        }
      },
    });
  };

  // Handle archive user (Super Admin)
  const handleArchiveUser = async () => {
    if (!user?._id) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Archive User',
      message: `Are you sure you want to archive ${user.fullName}? This will hide the user from active lists but data will be preserved.`,
      confirmText: 'Archive',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        await executeArchiveUser();
      },
    });
  };

  const executeArchiveUser = async () => {
    if (!user?._id) return;

    setArchiveLoading(true);
    try {
      await UserPageService.archiveUser(user._id);
      toast.success(`${user.fullName} has been archived successfully`);
      onAccessUpdate?.({ ...user, status: 'Archived' });
      onClose();
    } catch (error) {
      console.error("Error archiving user:", error);
      toast.error("Failed to archive user");
    } finally {
      setArchiveLoading(false);
    }
  };

  // Handle unarchive user (Super Admin)
  const handleUnarchiveUser = async () => {
    if (!user?._id) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Unarchive User',
      message: `Are you sure you want to unarchive ${user.fullName}? This will restore the user to pending status.`,
      confirmText: 'Unarchive',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        await executeUnarchiveUser();
      },
    });
  };

  const executeUnarchiveUser = async () => {
    if (!user?._id) return;

    setArchiveLoading(true);
    try {
      await UserPageService.unarchiveUser(user._id);
      toast.success(`${user.fullName} has been unarchived successfully`);
      onAccessUpdate?.({ ...user, status: 'Active' });
      onClose();
    } catch (error) {
      console.error("Error unarchiving user:", error);
      toast.error("Failed to unarchive user");
    } finally {
      setArchiveLoading(false);
    }
  };

  // Handle permanent delete user (Super Admin only)
  const handleDeleteUser = async () => {
    if (!user?._id) return;

    setEmailConfirmInput('');
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Permanent Delete Warning',
      message: `Are you sure you want to PERMANENTLY DELETE ${user.fullName}?\n\nThis action:\n• CANNOT be undone\n• Will delete ALL user data\n• Will remove ALL associated records\n\nTo confirm, type the user's email address: ${user.email}`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'danger',
      requireEmailConfirm: true,
      onConfirm: async () => {
        // Email check happens in the button disabled state, no need to check again here
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setEmailConfirmInput('');
        await executeDeleteUser();
      },
    });
  };

  const executeDeleteUser = async () => {
    if (!user?._id) return;

    setDeleteLoading(true);
    try {
      await UserPageService.deleteUser(user._id);
      toast.success(`${user.fullName} has been permanently deleted`);
      // User is deleted from database, trigger parent refresh
      onAccessUpdate?.(user);
      onClose();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user permanently");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle unreject user (Super Admin only)
  const handleUnrejectUser = async () => {
    if (!user?._id) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Restore Rejected User',
      message: `Are you sure you want to restore ${user.fullName}'s status back to pending approval? You can then approve them if needed.`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        await executeUnrejectUser();
      },
    });
  };

  const executeUnrejectUser = async () => {
    if (!user?._id) return;

    setUnrejectLoading(true);
    try {
      await UserPageService.unrejectUser(user._id);
      toast.success(`${user.fullName} has been restored to pending status. You can now approve them.`);
      onAccessUpdate?.({ ...user, status: 'Pending', approved: false });
    } catch (error) {
      console.error("Error unrejecting user:", error);
      toast.error("Failed to unreject user");
    } finally {
      setUnrejectLoading(false);
    }
  };

  // Handle restore revoked user (Super Admin only)
  const handleRestoreRevokedUser = async () => {
    if (!user?._id) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Restore Revoked User',
      message: `Are you sure you want to restore ${user.fullName}'s access? Their status will be changed from Revoked to Active.`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        await executeRestoreRevokedUser();
      },
    });
  };

  const executeRestoreRevokedUser = async () => {
    if (!user?._id) return;

    setRevokeRestoreLoading(true);
    try {
      await UserPageService.unrevokeUser(user._id);
      toast.success(`${user.fullName}'s access has been restored.`);
      onAccessUpdate?.({ ...user, status: 'Active', approved: true });
    } catch (error) {
      console.error("Error restoring revoked user:", error);
      toast.error("Failed to restore user access");
    } finally {
      setRevokeRestoreLoading(false);
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "N/A";
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      // Check if date is valid
      if (isNaN(dateObj.getTime())) return "N/A";
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getFullName = (): string => {
    const parts = [user.firstName, user.middleName, user.lastName].filter(
      Boolean
    );
    return parts.join(" ") || "N/A";
  };

  const getRoleName = (
    role: "AGENT" | "ADMIN" | "USER" | undefined
  ): string => {
    if (!role) return "N/A";
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const getRoleBadgeVariant = (
    role: "AGENT" | "ADMIN" | "USER" | undefined
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (role === "ADMIN") return "destructive"; // Admin
    if (role === "USER") return "default"; // User
    if (role === "AGENT") return "secondary"; // Agent
    return "outline";
  };

  const getStatusBadgeVariant = (
    status: string | undefined
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "Active") return "default";
    if (status === "Pending") return "secondary";
    if (status === "Rejected") return "destructive";
    if (status === "Revoked") return "destructive";
    if (status === "Inactive") return "destructive";
    return "outline";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-hidden">
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
            <div className="p-2 app-bg-primary-soft rounded-lg">
              <UserIcon className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">User Details</h2>
              <p className="text-sm app-text-subtle">
                View complete user information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:app-bg-error rounded-lg transition-colors"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Profile Section with Avatar */}
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.firstName}'s avatar`}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                  <UserIcon className="w-10 h-10 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold app-text">
                  {getFullName()}
                  {currentUser && user.email === currentUser.email && (
                    <span className="text-xl font-semibold text-gray-500 ml-2">(You)</span>
                  )}
                </h3>
                <p className="text-sm app-text-subtle">{user.email}</p>
                {user.status === "Rejected" && (
                  <Badge variant="destructive" className="mt-1">
                    Rejected
                  </Badge>
                )}
              </div>
            </div>

            {/* Rejection Reason Alert */}
            {user.status === "Rejected" && user.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800">Account Rejected</h4>
                    <p className="text-sm text-red-700 mt-1">{user.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Full Name
                  </label>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">{getFullName()}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Date of Birth
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{formatDate(user.dateOfBirth)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{user.phoneNumber}</p>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium app-text-subtle">
                    Location
                  </label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{user.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Official Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Badge ID
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">{user.badgeId}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    User ID
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{user._id || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Documents */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verification Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID Document */}
                <div className="space-y-2">
                  <label className="text-sm font-medium app-text-subtle">
                    ID Document
                  </label>
                  {user.idDocumentUrl ? (
                    <a
                      href={user.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <img
                          src={user.idDocumentUrl}
                          alt="ID Document"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                        <div className="hidden h-40 bg-gray-100 items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="p-2 bg-gray-50 text-center text-sm text-blue-600">
                          Click to view full size
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center bg-gray-50">
                      <Image className="w-10 h-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">No ID document uploaded</p>
                    </div>
                  )}
                </div>

                {/* Selfie with ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium app-text-subtle">
                    Selfie with ID
                  </label>
                  {user.selfieWithIdUrl ? (
                    <a
                      href={user.selfieWithIdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <img
                          src={user.selfieWithIdUrl}
                          alt="Selfie with ID"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                      <div className="hidden h-40 bg-gray-100 items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="p-2 bg-gray-50 text-center text-sm text-blue-600">
                          Click to view full size
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center bg-gray-50">
                      <Image className="w-10 h-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">No selfie uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Account Status
              </h3>
              <div className="app-bg-neutral rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium app-text-subtle block mb-1">
                      Role
                    </label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 app-text-primary" />
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleName(user.role)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium app-text-subtle block mb-1">
                      Status
                    </label>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status || "N/A"}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium app-text-subtle block mb-1">
                      Approval Status
                    </label>
                    <div className="flex items-center gap-2">
                      {user.approved ? (
                        <>
                          <CheckCircle className="h-4 w-4 app-text-success" />
                          <Badge
                            variant="default"
                            className="app-bg-success-soft app-text-success hover:opacity-90"
                          >
                            Approved
                          </Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 app-text-secondary" />
                          <Badge
                            variant="secondary"
                            className="app-bg-secondary-soft app-text-secondary hover:opacity-90"
                          >
                            Pending
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain Wallet Section - Admin only */}
            {(currentUser?.isSuperAdmin || currentUser?.role === 'ADMIN') && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Blockchain Wallet (MetaMask)
                {user.walletAuthorized && (
                  <Badge variant="default" className="ml-2 bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Authorized
                  </Badge>
                )}
              </h3>
              <div className="app-bg-neutral rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Assign a MetaMask wallet address to this user. Authorized wallets can perform blockchain operations like storing certificates.
                </p>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x..."
                        className="pl-10 font-mono text-sm"
                        disabled={walletLoading || isRejected || isRevoked}
                      />
                    </div>
                    {walletAddress && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyWallet}
                        title="Copy wallet address"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="authorize-wallet"
                      checked={authorizeWallet}
                      onCheckedChange={(checked) => setAuthorizeWallet(checked as boolean)}
                      disabled={walletLoading || isRejected || isRevoked || !walletAddress}
                    />
                    <Label htmlFor="authorize-wallet" className="text-sm cursor-pointer">
                      Authorize wallet for blockchain operations
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateWallet}
                      disabled={walletLoading || isRejected || isRevoked || !walletAddress}
                      size="sm"
                      className="app-bg-primary hover:app-bg-secondary"
                    >
                      {walletLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          {user.walletAddress ? "Update Wallet" : "Save Wallet"}
                        </>
                      )}
                    </Button>
                    {walletAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWalletAddress("");
                          setAuthorizeWallet(false);
                        }}
                        disabled={walletLoading}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {user.walletAddress && (
                  <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current wallet in database:</p>
                        <code className="text-sm bg-white px-2 py-1 rounded border font-mono">{user.walletAddress}</code>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Status:</p>
                        {user.walletAuthorized ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Authorized
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Authorized
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Account Timestamps */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Account Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Account Created
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Last Updated
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{formatDate(user.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          {onApprove && onReject && (
            <div className="pt-6 border-t mt-6">
              {isRejected ? (
                <>
                  {/* Rejected User Section */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-700">
                      This user has been rejected.
                      {currentUser?.isSuperAdmin ? (
                        <> As Super Admin, you can restore this account to pending status or approve it.</>
                      ) : (
                        <> Contact a Super Admin to restore or approve this account.</>
                      )}
                    </p>
                    {user.rejectionReason && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <p className="text-xs text-red-600 font-semibold">Rejection Reason:</p>
                        <p className="text-sm text-red-700 mt-1">{user.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                  {currentUser?.isSuperAdmin ? (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleUnrejectUser}
                        disabled={unrejectLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {unrejectLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Restore to Pending
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        disabled
                        className="flex-1 opacity-50 cursor-not-allowed"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject User
                      </Button>
                      <Button
                        disabled
                        className="flex-1 opacity-50 cursor-not-allowed"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve User
                      </Button>
                    </div>
                  )}
                </>
              ) : isRevoked ? (
                <>
                  {/* Revoked User Section */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-700">
                      This user's access has been revoked.
                      {currentUser?.isSuperAdmin ? (
                        <> As Super Admin, you can restore this account to active status.</>
                      ) : (
                        <> Contact a Super Admin to restore this account.</>
                      )}
                    </p>
                  </div>
                  {currentUser?.isSuperAdmin ? (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleRestoreRevokedUser}
                        disabled={revokeRestoreLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {revokeRestoreLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Restore Access
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full opacity-50 cursor-not-allowed"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Access Revoked
                    </Button>
                  )}
                </>
              ) : !user.approved ? (
                <>
                  {/* Pending Approval Section */}
                  <div className="app-bg-secondary-soft border border-[color:var(--app-secondary)]/30 rounded-lg p-4 mb-4">
                    <p className="text-sm app-text-secondary">
                      This user account is pending approval. Review the
                      information above and take action below.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => onReject(user)}
                      variant="outline"
                      className="flex-1 border-[color:var(--app-error)]/50 app-text-error hover:bg-[color:var(--app-error)]/10 hover:border-[color:var(--app-error)]/70"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject User
                    </Button>
                    <Button
                      onClick={() => onApprove(user)}
                      className="flex-1 app-bg-success text-white hover:opacity-90"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve User
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Already Approved Section */}
                  <div className="app-bg-success-soft border border-[color:var(--app-success)]/30 rounded-lg p-4 mb-4">
                    <p className="text-sm app-text-success">
                      This user account is approved and has access to the
                      system.
                    </p>
                  </div>
                  <div className="flex gap-3 items-center">
                    {user.role === 'AGENT' && user.status === 'Active' && (currentUser?.role === 'ADMIN' || currentUser?.isSuperAdmin) && (
                      <>
                        
                        <Button
                          onClick={handlePromoteToAdmin}
                          disabled={promotionLoading}
                          className="app-bg-primary hover:app-bg-secondary text-white"
                          size="sm"
                        >
                          {promotionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Promoting...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Promote to Admin
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {user.role === 'ADMIN' && user.status === 'Active' && !user.isSuperAdmin && currentUser?.isSuperAdmin && (
                      <>
                        
                        <Button
                          onClick={handleDemoteAdminToAgent}
                          disabled={demotionLoading}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          size="sm"
                        >
                          {demotionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Demoting...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Demote to Agent
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {(currentUser?.isSuperAdmin || currentUser?.role === 'ADMIN') && (
                      <Button
                        onClick={handleRevokeUser}
                        variant="outline"
                        className="border-[color:var(--app-error)]/50 app-text-error hover:bg-[color:var(--app-error)]/10 hover:border-[color:var(--app-error)]/70"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Revoke Access
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-6 border-t mt-6">
            <div className="flex gap-2">
              {/* Super Admin Powers - Archive/Unarchive */}
              {currentUser?.isSuperAdmin && user.email !== 'super@gmail.com' && (
                <>
                  {user.status === 'Archived' ? (
                    <Button
                      onClick={handleUnarchiveUser}
                      disabled={archiveLoading}
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      {archiveLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Unarchiving...
                        </>
                      ) : (
                        "Unarchive User"
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleArchiveUser}
                      disabled={archiveLoading}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      {archiveLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        "Archive User"
                      )}
                    </Button>
                  )}
                  
                  {/* Super Admin - Permanent Delete */}
                  <Button
                    onClick={handleDeleteUser}
                    disabled={deleteLoading}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Permanently"
                    )}
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleViewProfileAndActivities}
                className="flex items-center gap-2 app-bg-primary hover:app-bg-secondary text-white cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                View Profile & Activities
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className={`text-xl font-semibold mb-4 ${
              confirmDialog.variant === 'danger' ? 'text-red-600' : 'text-orange-600'
            }`}>
              {confirmDialog.title}
            </h3>
            <p className="text-gray-700 whitespace-pre-line mb-6">
              {confirmDialog.message}
            </p>
            
            {confirmDialog.requireEmailConfirm && (
              <div className="mb-4">
                <Label htmlFor="emailConfirm" className="text-sm font-medium mb-2 block">
                  Type email to confirm:
                </Label>
                <Input
                  id="emailConfirm"
                  type="text"
                  value={emailConfirmInput}
                  onChange={(e) => setEmailConfirmInput(e.target.value)}
                  placeholder={user?.email}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                  setEmailConfirmInput('');
                }}
                variant="outline"
              >
                {confirmDialog.cancelText}
              </Button>
              <Button
                onClick={confirmDialog.onConfirm}
                className={
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }
                disabled={confirmDialog.requireEmailConfirm && emailConfirmInput !== user?.email}
              >
                {confirmDialog.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
