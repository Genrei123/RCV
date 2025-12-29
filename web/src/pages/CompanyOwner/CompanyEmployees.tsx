import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Mail, Check, X, Globe, Smartphone, Monitor, Clock, RefreshCw, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import { UserPageService } from "@/services/userPageService";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-toastify";
import { AddEmployeeModal } from "@/components/AddEmployeeModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Employee {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  role: string;
  badgeId?: string;
  hasWebAccess: boolean;
  hasAppAccess: boolean;
  hasKioskAccess: boolean;
  createdAt: string;
}

export function CompanyEmployees() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companyOwner, setCompanyOwner] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("employees");
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
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

    setCompanyOwner(ownerData);
    await Promise.all([
      fetchEmployees(ownerData._id),
      fetchPendingInvites(ownerData._id),
    ]);
    setLoading(false);
  };

  const fetchPendingInvites = async (companyOwnerId: string) => {
    setInvitesLoading(true);
    try {
      const response = await CompanyOwnerService.getPendingInvites(companyOwnerId);
      setPendingInvites(response.invites || []);
    } catch (error: any) {
      console.error("Error fetching pending invites:", error);
    } finally {
      setInvitesLoading(false);
    }
  };

  const fetchEmployees = async (companyOwnerId: string) => {
    setEmployeesLoading(true);
    try {
      const response = await CompanyOwnerService.getEmployees(companyOwnerId);
      setEmployees(response.employees || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleApproveEmployee = async (userId: string) => {
    try {
      await UserPageService.approveUser(userId);
      toast.success("Employee approved successfully!");
      fetchEmployees(companyOwner._id);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve employee");
    }
  };

  const handleRejectEmployee = async (userId: string) => {
    try {
      await UserPageService.rejectUser(userId);
      toast.success("Employee rejected");
      fetchEmployees(companyOwner._id);
    } catch (error: any) {
      toast.error(error.message || "Failed to reject employee");
    }
  };

  const handleAccessToggle = async (
    employeeId: string,
    accessType: 'hasWebAccess' | 'hasAppAccess' | 'hasKioskAccess',
    currentValue: boolean
  ) => {
    setUpdatingAccess(employeeId);
    try {
      await CompanyOwnerService.updateEmployeeAccess(
        employeeId,
        companyOwner._id,
        { [accessType]: !currentValue }
      );

      // Update local state
      setEmployees(prev =>
        prev.map(emp =>
          emp._id === employeeId
            ? { ...emp, [accessType]: !currentValue }
            : emp
        )
      );

      const accessName = accessType === 'hasWebAccess' ? 'Web' : accessType === 'hasAppAccess' ? 'App' : 'Kiosk';
      toast.success(`${accessName} access ${!currentValue ? 'granted' : 'revoked'}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update access");
    } finally {
      setUpdatingAccess(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await CompanyOwnerService.cancelInvite(inviteId, companyOwner._id);
      toast.success("Invite cancelled");
      fetchPendingInvites(companyOwner._id);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invite");
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await CompanyOwnerService.resendInvite(inviteId, companyOwner._id);
      toast.success("Invite resent successfully");
      fetchPendingInvites(companyOwner._id);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invite");
    }
  };

  if (loading) {
    return (
      <PageContainer title="Employees">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Company Employees"
      description="Manage your team members and permissions"
    >
      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        companyOwnerId={companyOwner?._id || ""}
        companyName={companyOwner?.companyName || ""}
        onSuccess={() => {
          fetchEmployees(companyOwner._id);
          fetchPendingInvites(companyOwner._id);
        }}
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {companyOwner?.companyName} - Team Members
            </h1>
            <p className="text-sm text-gray-500">
              Total: {employees.length} employees | {pendingInvites.length} pending invites
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employees ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Invites ({pendingInvites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          {employeesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Employees Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Invite team members to join your organization
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Employee
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">
                      Access Control
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee._id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {employee.firstName?.[0] || 'U'}{employee.lastName?.[0] || ''}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {employee.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {employee.badgeId || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {employee.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {employee.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {employee.status === "Pending" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        ) : employee.status === "Active" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center gap-2">
                          {/* Web Access */}
                          <Button
                            size="sm"
                            variant={employee.hasWebAccess ? "default" : "outline"}
                            onClick={() => handleAccessToggle(employee._id, 'hasWebAccess', employee.hasWebAccess)}
                            disabled={updatingAccess === employee._id || employee.status !== "Active"}
                            className={`${
                              employee.hasWebAccess
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "hover:bg-blue-50"
                            }`}
                            title="Web Access - Manage members and view maps"
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                          
                          {/* App Access */}
                          <Button
                            size="sm"
                            variant={employee.hasAppAccess ? "default" : "outline"}
                            onClick={() => handleAccessToggle(employee._id, 'hasAppAccess', employee.hasAppAccess)}
                            disabled={updatingAccess === employee._id || employee.status !== "Active"}
                            className={`${
                              employee.hasAppAccess
                                ? "bg-green-600 hover:bg-green-700"
                                : "hover:bg-green-50"
                            }`}
                            title="App Access - Report knock-off products"
                          >
                            <Smartphone className="h-4 w-4" />
                          </Button>
                          
                          {/* Kiosk Access */}
                          <Button
                            size="sm"
                            variant={employee.hasKioskAccess ? "default" : "outline"}
                            onClick={() => handleAccessToggle(employee._id, 'hasKioskAccess', employee.hasKioskAccess)}
                            disabled={updatingAccess === employee._id || employee.status !== "Active"}
                            className={`${
                              employee.hasKioskAccess
                                ? "bg-purple-600 hover:bg-purple-700"
                                : "hover:bg-purple-50"
                            }`}
                            title="Kiosk Access - Technician access to kiosk machines"
                          >
                            <Monitor className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {employee.status === "Pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveEmployee(employee._id)}
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
                        {employee.status === "Active" && (
                          <span className="text-sm text-gray-500">Manage access above</span>
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
        </TabsContent>

        {/* Pending Invites Tab */}
        <TabsContent value="pending">
          <Card className="border-2 border-gray-200">
            <CardContent className="p-6">
              {invitesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : pendingInvites.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Pending Invites
                  </h3>
                  <p className="text-gray-600 mb-6">
                    All sent invitations have been accepted or expired
                  </p>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send New Invite
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">
                          Permissions
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                          Sent
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvites.map((invite) => (
                        <tr
                          key={invite._id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {invite.employeeEmail || "Generic Link"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center gap-2">
                              {invite.hasWebAccess && (
                                <Globe className="h-5 w-5 text-blue-600" />
                              )}
                              {invite.hasAppAccess && (
                                <Smartphone className="h-5 w-5 text-green-600" />
                              )}
                              {invite.hasKioskAccess && (
                                <Monitor className="h-5 w-5 text-purple-600" />
                              )}
                              {!invite.hasWebAccess && !invite.hasAppAccess && !invite.hasKioskAccess && (
                                <span className="text-xs text-gray-400">No permissions set</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {invite.expired ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Expired
                              </span>
                            ) : invite.emailSent ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Email Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Link Only
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-500">
                              {new Date(invite.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              {invite.employeeEmail && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResendInvite(invite._id)}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                  title="Resend Invite"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelInvite(invite._id)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                title="Cancel Invite"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Access Control Legend */}
      <Card className="mt-6 border-2 border-purple-200 bg-purple-50">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">
            Access Control Types
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Web Only</h4>
                <p className="text-sm text-blue-700">
                  Can manage team members, view maps, and access web dashboard. 
                  Cannot remove the company owner.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-1">App Only</h4>
                <p className="text-sm text-green-700">
                  Can report knock-off products in the mobile app. 
                  Reports appear on the company maps for tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">Kiosk Only</h4>
                <p className="text-sm text-purple-700">
                  Technician access to company kiosk machines. 
                  For maintenance and technical operations.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Statistics */}
      {employees.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-green-900">
                Active Employees
              </p>
              <p className="text-2xl font-bold text-green-700 mt-2">
                {employees.filter((e) => e.status === "Active").length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-yellow-900">
                Pending Approval
              </p>
              <p className="text-2xl font-bold text-yellow-700 mt-2">
                {employees.filter((e) => e.status === "Pending").length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-blue-900">
                Web Access
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-2">
                {employees.filter((e) => e.hasWebAccess).length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-green-900">
                App Access
              </p>
              <p className="text-2xl font-bold text-green-700 mt-2">
                {employees.filter((e) => e.hasAppAccess).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
