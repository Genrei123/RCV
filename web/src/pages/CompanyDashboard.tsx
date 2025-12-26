import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyOwnerService } from "../services/companyOwnerService";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageContainer } from "../components/PageContainer";
import { Building2, Package, ShieldCheck, MapPin, Users, LogOut, Mail, Check, X, Copy, UserPlus, Wallet } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "react-toastify";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

export function CompanyDashboard() {
  const navigate = useNavigate();
  const [companyOwner, setCompanyOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = CompanyOwnerService.isCompanyOwnerLoggedIn();
      
      if (!isLoggedIn) {
        navigate("/company/login");
        return;
      }

      const ownerData = CompanyOwnerService.getCompanyOwnerData();
      if (!ownerData) {
        navigate("/company/login");
        return;
      }

      // Check approval status
      if (!ownerData.approved) {
        navigate("/company/pending-approval");
        return;
      }

      setCompanyOwner(ownerData);
      checkWalletConnection();
      fetchEmployees(ownerData._id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchEmployees = async (companyOwnerId: string) => {
    setEmployeesLoading(true);
    try {
      const response = await CompanyOwnerService.getEmployees(companyOwnerId);
      setEmployees(response.employees || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleApproveEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowAccessModal(true);
  };

  const confirmApproveEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      await CompanyOwnerService.approveEmployee(selectedEmployee._id, companyOwner._id);
      
      // Show success with wallet verification reminder
      if (selectedEmployee.walletAddress) {
        toast.success(
          <div>
            <div className="font-bold mb-1">✅ Employee approved!</div>
            <div className="text-sm">They will need to verify their MetaMask wallet when logging in.</div>
            <div className="text-xs text-gray-300 mt-1 font-mono">
              Wallet: {selectedEmployee.walletAddress.substring(0, 10)}...{selectedEmployee.walletAddress.substring(38)}
            </div>
          </div>,
          { autoClose: 8000 }
        );
      } else {
        toast.success('Employee approved successfully!');
      }
      
      setShowAccessModal(false);
      setSelectedEmployee(null);
      fetchEmployees(companyOwner._id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve employee');
    }
  };

  const handleRejectEmployee = async (userId: string) => {
    try {
      await CompanyOwnerService.rejectEmployee(userId, companyOwner._id);
      toast.success('Employee rejected');
      fetchEmployees(companyOwner._id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject employee');
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setWalletConnected(accounts.length > 0);
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true);
    try {
      await CompanyOwnerService.sendVerificationEmail(companyOwner.email);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleGenerateInviteLink = async () => {
    try {
      const response = await CompanyOwnerService.generateInviteLink(companyOwner._id);
      setInviteLink(response.inviteLink);
      setShowInviteModal(true);
      toast.success('Invite link generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invite link');
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found");
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletConnected(true);
      toast.success('Wallet connected!');
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
  };

  const handleLogout = () => {
    CompanyOwnerService.logout();
    navigate("/");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <PageContainer title="Company Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {companyOwner?.companyName}
            </h1>
            <p className="text-sm text-gray-500">Company Owner Portal</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
        {/* Email Verification Alert */}
        {!companyOwner?.emailVerified && (
          <Card className="mb-6 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">Email Not Verified</p>
                  <p className="text-sm text-yellow-800">Please verify your email to access all features</p>
                </div>
              </div>
              <Button
                onClick={handleSendVerificationEmail}
                disabled={sendingVerification}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {sendingVerification ? 'Sending...' : 'Send Verification Email'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wallet Connection Alert */}
        {!walletConnected && (
          <Card className="mb-6 border-blue-400 bg-blue-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">MetaMask Not Connected</p>
                  <p className="text-sm text-blue-800">Connect your wallet to use blockchain features</p>
                </div>
              </div>
              <Button
                onClick={connectWallet}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {companyOwner?.companyName}!
          </h2>
          <p className="text-gray-600">
            Manage your products and certificates with blockchain security
          </p>
        </div>

        {/* Company Info Card */}
        <Card className="mb-8 border-2 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Company Name</p>
                <p className="text-base font-medium text-gray-900">
                  {companyOwner?.companyName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-gray-900">
                    {companyOwner?.email}
                  </p>
                  {companyOwner?.emailVerified ? (
                    <span title="Verified">
                      <Check className="h-4 w-4 text-green-600" />
                    </span>
                  ) : (
                    <span title="Not Verified">
                      <X className="h-4 w-4 text-red-600" />
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Wallet Address</p>
                <p className="text-base font-mono text-sm text-gray-900 truncate">
                  {companyOwner?.walletAddress}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Approved
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-base font-medium text-gray-900">
                  {companyOwner?.latitude}, {companyOwner?.longitude}
                </p>
              </div>
              {companyOwner?.businessPermitUrl && (
                <div>
                  <p className="text-sm text-gray-500">Business Permit</p>
                  <a
                    href={companyOwner.businessPermitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employee Invite Section */}
        <Card className="mb-8 border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                Invite Employees
              </h3>
              <Button
                onClick={handleGenerateInviteLink}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Generate Invite Link
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Generate a secure invite link to add employees to your company. Employees who register with this link will automatically be added to your organization.
            </p>
          </CardContent>
        </Card>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Employee Invite Link
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share this link with employees you want to invite. The link includes your company information.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <p className="text-sm font-mono break-all text-gray-800">
                    {inviteLink}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCopyInviteLink}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={() => setShowInviteModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Products */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-400"
            onClick={() => navigate("/company/products")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Products
              </h3>
              <p className="text-sm text-gray-600">
                Manage your product catalog and certificates
              </p>
            </CardContent>
          </Card>

          {/* Blockchain */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-400"
            onClick={() => navigate("/company/blockchain")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Blockchain
              </h3>
              <p className="text-sm text-gray-600">
                View blockchain records and verify certificates
              </p>
            </CardContent>
          </Card>

          {/* Maps */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-400"
            onClick={() => navigate("/company/maps")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Maps
              </h3>
              <p className="text-sm text-gray-600">
                View product locations and distribution
              </p>
            </CardContent>
          </Card>

          {/* Employees */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-400"
            onClick={() => navigate("/company/employees")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Employees
              </h3>
              <p className="text-sm text-gray-600">
                Manage team members and permissions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card className="mt-8 border-2 border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              Team Members ({employees.length})
            </h3>
            {employeesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No employees yet. Generate an invite link to add team members.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Wallet</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{employee.fullName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{employee.email}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {employee.walletAddress ? (
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-orange-600" />
                              <span className="font-mono text-xs">
                                {employee.walletAddress.substring(0, 6)}...{employee.walletAddress.substring(38)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not provided</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{employee.role}</td>
                        <td className="py-3 px-4">
                          {employee.status === 'Pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          ) : employee.status === 'Active' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {employee.status === 'Pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveEmployee(employee)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectEmployee(employee._id)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎉 Your company is now verified!
          </h3>
          <p className="text-blue-700">
            You have full access to all company features. Start by adding products 
            to your catalog or managing your team members.
          </p>
        </div>

        {/* Access Preview Modal */}
        {showAccessModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Approve Employee
              </h3>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-1">
                  Employee Information
                </p>
                <p className="text-blue-700">{selectedEmployee.fullName}</p>
                <p className="text-blue-600 text-sm">{selectedEmployee.email}</p>
                {selectedEmployee.walletAddress && (
                  <div className="mt-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-orange-600" />
                    <p className="text-orange-600 text-xs font-mono">
                      {selectedEmployee.walletAddress}
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Default Access Permissions
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  This employee will be granted the following access:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">Web Access</p>
                      <p className="text-blue-700 text-xs">
                        Can manage team members and view company maps
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900 text-sm">App Access</p>
                      <p className="text-green-700 text-xs">
                        Can report knock-off products via mobile app
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-100 border border-gray-300 rounded-lg opacity-60">
                    <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
                      <X className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">Kiosk Access</p>
                      <p className="text-gray-600 text-xs">
                        Not granted by default (can be enabled later)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-6">
                You can adjust these permissions anytime from the Employees page.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={confirmApproveEmployee}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm & Approve
                </Button>
                <Button
                  onClick={() => {
                    setShowAccessModal(false);
                    setSelectedEmployee(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </PageContainer>
    );
  }
