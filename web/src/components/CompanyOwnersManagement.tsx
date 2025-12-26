import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { CompanyOwnerAdminService, type CompanyOwnerForAdmin } from "../services/companyOwnerAdminService";
import { toast } from "react-toastify";
import { Building2, Check, X, Eye, Mail, Wallet, MapPin, FileText, Clock } from "lucide-react";
import { DataTable, type Column } from "./DataTable";

interface CompanyOwnersManagementProps {
  onRefresh?: () => void;
}

export function CompanyOwnersManagement({ onRefresh }: CompanyOwnersManagementProps) {
  const [companyOwners, setCompanyOwners] = useState<CompanyOwnerForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOwnerForAdmin | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCompanyOwners();
  }, []);

  const fetchCompanyOwners = async () => {
    setLoading(true);
    try {
      const response = await CompanyOwnerAdminService.getAllCompanyOwners();
      setCompanyOwners(response.companyOwners || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch company owners');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await CompanyOwnerAdminService.approveCompanyOwner(id);
      toast.success('Company approved successfully!');
      fetchCompanyOwners();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve company');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this company registration?')) {
      return;
    }
    try {
      await CompanyOwnerAdminService.rejectCompanyOwner(id);
      toast.success('Company rejected');
      fetchCompanyOwners();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject company');
    }
  };

  const handleViewDetails = (company: CompanyOwnerForAdmin) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const columns: Column[] = [
    {
      key: "companyName",
      label: "Company Name",
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const statusColors = {
          Pending: 'bg-yellow-100 text-yellow-800',
          Approved: 'bg-green-100 text-green-800',
          Rejected: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[value as keyof typeof statusColors]}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: "emailVerified",
      label: "Email Verified",
      render: (value) => (
        <span className="flex items-center gap-1">
          {value ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-600 text-sm">Yes</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-red-600 text-sm">No</span>
            </>
          )}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleViewDetails(row as CompanyOwnerForAdmin)}
            variant="outline"
            size="sm"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'Pending' && (
            <>
              <Button
                onClick={() => handleApprove(row._id)}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                onClick={() => handleReject(row._id)}
                variant="destructive"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Loading company owners...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Company Owners</h3>
                <p className="text-sm text-gray-500">
                  Manage company registrations and approvals
                </p>
              </div>
            </div>
            <Button onClick={fetchCompanyOwners} variant="outline">
              Refresh
            </Button>
          </div>

          {companyOwners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No company owners registered yet
            </div>
          ) : (
            <DataTable
              title="Company Registrations"
              columns={columns}
              data={companyOwners}
              searchPlaceholder="Search companies..."
            />
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  {selectedCompany.companyName}
                </h3>
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCompany.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      selectedCompany.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedCompany.status}
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <Mail className="h-5 w-5 text-gray-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium text-gray-900">{selectedCompany.email}</p>
                      {selectedCompany.emailVerified ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="flex items-start gap-4">
                  <Wallet className="h-5 w-5 text-gray-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Wallet Address</p>
                    <p className="text-base font-mono text-sm text-gray-900 break-all">
                      {selectedCompany.walletAddress}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-gray-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-base text-gray-900">
                      Lat: {selectedCompany.latitude}, Lng: {selectedCompany.longitude}
                    </p>
                    {selectedCompany.address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedCompany.address}</p>
                    )}
                  </div>
                </div>

                {/* Business Permit */}
                <div className="flex items-start gap-4">
                  <FileText className="h-5 w-5 text-gray-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Business Permit</p>
                    <a
                      href={selectedCompany.businessPermitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm underline"
                    >
                      View Document
                    </a>
                  </div>
                </div>

                {/* Registration Date */}
                <div className="text-sm text-gray-500">
                  Registered on: {new Date(selectedCompany.createdAt).toLocaleString()}
                </div>

                {/* Action Buttons */}
                {selectedCompany.status === 'Pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleApprove(selectedCompany._id);
                        setShowDetailsModal(false);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve Company
                    </Button>
                    <Button
                      onClick={() => {
                        handleReject(selectedCompany._id);
                        setShowDetailsModal(false);
                      }}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Company
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
