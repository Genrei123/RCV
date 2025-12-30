import { useState, useEffect } from "react";
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
  Monitor,
  Smartphone,
  Loader2,
  Wallet,
  Copy,
  Check,
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
  onApprove?: (user: User) => void;
  onReject?: (user: User) => void;
  onAccessUpdate?: (user: User) => void;
}

export function UserDetailModal({
  isOpen,
  onClose,
  user,
  onApprove,
  onReject,
  onAccessUpdate,
}: UserDetailModalProps) {
  const [accessLoading, setAccessLoading] = useState(false);
  const [localWebAccess, setLocalWebAccess] = useState(false);
  const [localAppAccess, setLocalAppAccess] = useState(true);
  
  // Wallet management state
  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [addToAuthorized, setAddToAuthorized] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setLocalWebAccess(user.webAccess ?? false);
      setLocalAppAccess(user.appAccess ?? true);
      setWalletAddress(user.walletAddress || "");
    }
  }, [user?._id, user?.webAccess, user?.appAccess, user?.walletAddress]);

  if (!isOpen || !user) return null;

  // Check if user is rejected - rejected users have no access and cannot be modified
  const isRejected = user.status === "Rejected";
  // Check if user is admin - admins always have full access
  const isAdmin = user.role === "ADMIN";

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
    
    // Validate wallet address format
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast.error("Invalid wallet address format. Must be a valid Ethereum address.");
      return;
    }

    setWalletLoading(true);
    try {
      const result = await MetaMaskService.updateUserWallet(
        user._id,
        walletAddress,
        addToAuthorized
      );
      
      if (result.success) {
        toast.success(
          addToAuthorized 
            ? "Wallet updated and added to authorized list" 
            : "Wallet address updated successfully"
        );
        // Update parent
        onAccessUpdate?.({ ...user, walletAddress: walletAddress || undefined });
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

  const handleAccessChange = async (type: 'web' | 'app', value: boolean) => {
    if (!user?._id) return;
    
    // Don't allow access changes for rejected users
    if (isRejected) {
      toast.error("Cannot modify access for rejected users");
      return;
    }

    // Don't allow access changes for admin users - they always have full access
    if (isAdmin) {
      toast.error("Admin users always have full access to both platforms");
      return;
    }

    const newWebAccess = type === 'web' ? value : localWebAccess;
    const newAppAccess = type === 'app' ? value : localAppAccess;

    // Ensure at least one access type is enabled
    if (!newWebAccess && !newAppAccess) {
      toast.error("User must have at least one access type enabled");
      return;
    }

    // Update local state immediately for responsiveness
    if (type === 'web') setLocalWebAccess(value);
    if (type === 'app') setLocalAppAccess(value);

    setAccessLoading(true);
    try {
      await UserPageService.updateUserAccess(user._id, newWebAccess, newAppAccess);
      toast.success("Access permissions updated");
      // Notify parent to refresh
      onAccessUpdate?.({ ...user, webAccess: newWebAccess, appAccess: newAppAccess });
    } catch (error) {
      // Revert on error
      if (type === 'web') setLocalWebAccess(!value);
      if (type === 'app') setLocalAppAccess(!value);
      toast.error("Failed to update access permissions");
    } finally {
      setAccessLoading(false);
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
    if (status === "Inactive") return "destructive";
    return "outline";
  };

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
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors"
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
                <h3 className="text-xl font-semibold app-text">{getFullName()}</h3>
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
                        <div className="hidden h-40 bg-gray-100 flex items-center justify-center">
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
                        <div className="hidden h-40 bg-gray-100 flex items-center justify-center">
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

            {/* Access Permissions */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Permissions
              </h3>
              {isRejected ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    This user has been rejected and has no access to any platform.
                  </p>
                </div>
              ) : isAdmin ? (
                /* Admin users always have full access */
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Admin users always have full access to both the mobile app and web dashboard.
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Mobile App</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-blue-700">Web Dashboard</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="app-bg-neutral rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                      <div>
                        <Label htmlFor="app-access" className="text-sm font-medium cursor-pointer">
                          Mobile App Access
                        </Label>
                        <p className="text-xs text-gray-500">
                          Allow user to access the mobile application
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      id="app-access"
                      checked={localAppAccess}
                      onCheckedChange={(checked) => handleAccessChange('app', checked as boolean)}
                      disabled={accessLoading}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-green-600" />
                      <div>
                        <Label htmlFor="web-access" className="text-sm font-medium cursor-pointer">
                          Web Dashboard Access
                        </Label>
                        <p className="text-xs text-gray-500">
                          Allow user to access the web dashboard
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      id="web-access"
                      checked={localWebAccess}
                      onCheckedChange={(checked) => handleAccessChange('web', checked as boolean)}
                      disabled={accessLoading}
                      className="h-5 w-5"
                    />
                  </div>
                  {accessLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating permissions...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Blockchain Wallet Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Blockchain Wallet (MetaMask)
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
                        disabled={walletLoading || isRejected}
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
                      id="add-authorized"
                      checked={addToAuthorized}
                      onCheckedChange={(checked) => setAddToAuthorized(checked as boolean)}
                      disabled={walletLoading || isRejected || !walletAddress}
                    />
                    <Label htmlFor="add-authorized" className="text-sm cursor-pointer">
                      Add to authorized wallets list (allows blockchain operations)
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateWallet}
                      disabled={walletLoading || isRejected}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {walletLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          Update Wallet
                        </>
                      )}
                    </Button>
                    {user.walletAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWalletAddress("");
                          setAddToAuthorized(false);
                        }}
                        disabled={walletLoading}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {user.walletAddress && (
                  <div className="mt-2 text-xs text-gray-500">
                    Current wallet: <code className="bg-gray-100 px-1 py-0.5 rounded">{user.walletAddress}</code>
                  </div>
                )}
              </div>
            </div>

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
                  {/* Rejected User Section - Buttons Disabled */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-700">
                      This user has been rejected. The decision has already been made and cannot be changed.
                    </p>
                  </div>
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
                  <div className="flex justify-end">
                    <Button
                      onClick={() => onReject(user)}
                      variant="outline"
                      className="border-[color:var(--app-error)]/50 app-text-error hover:bg-[color:var(--app-error)]/10 hover:border-[color:var(--app-error)]/70"
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
            <Button
              onClick={onClose}
              className="app-bg-primary hover:opacity-90 text-white cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
