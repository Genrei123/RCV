import { useState, useEffect, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { AuditLogService, type AuditLog } from "@/services/auditLogService";
import { DataTable } from "@/components/DataTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import * as ExcelJS from "exceljs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: 10, // increased for global view
  });
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState<"all" | "action" | "compliance" | "scans">("all");

  useEffect(() => {
    fetchLogs();
  }, [pagination.current_page]);
  
  // Also fetch all for export properly
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  useEffect(() => {
    // optionally fetch everything for accurate sorting over the full dataset if wanted, 
    // or just rely on server.
    fetchAllLogsForExport();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await AuditLogService.getAllLogs(pagination.current_page, pagination.per_page);
      setLogs(response.data || []);
      setPagination(response.pagination || {
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        per_page: 10,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLogsForExport = async () => {
    try {
      const first = await AuditLogService.getAllLogs(1, 100);
      if (!first || !first.pagination) return;
      let all: AuditLog[] = [...(first.data || [])];
      const totalPages = first.pagination.total_pages || 1;
      // We might want to cap this if it's too large, but for now we fetch all
      for (let p = 2; p <= totalPages; p++) {
        const resp = await AuditLogService.getAllLogs(p, 100);
        all = all.concat(resp.data || []);
      }
      setAllLogs(all);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const progressDelay = 800;
      let progressToastId: string | number | null = null;
      const progressTimer = setTimeout(() => {
        progressToastId = toast.info("Preparing Excel export…");
      }, progressDelay);

      const dataToExport = sortedAllLogs;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Audit Trail");

      worksheet.columns = [
        { header: "Date", key: "date", width: 22 },
        { header: "User", key: "user", width: 30 },
        { header: "Action", key: "action", width: 38 },
        { header: "Type", key: "type", width: 18 },
        { header: "Platform", key: "platform", width: 12 },
        { header: "User Agent", key: "userAgent", width: 55 },
        { header: "Log ID", key: "logId", width: 38 },
      ];

      dataToExport.forEach((l) => {
        worksheet.addRow({
          date: new Date(l.createdAt).toLocaleString(),
          user: l.user ? `${l.user.firstName} ${l.user.lastName} (${l.user.email})` : "System",
          action: (l.action || "").replace(/\n|\r/g, " "),
          type: l.actionType || "",
          platform: l.platform || "",
          userAgent: (l.userAgent || "").replace(/\n|\r/g, " "),
          logId: l._id,
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF005440" },
        };
        cell.font = {
          bold: true,
          size: 11,
          color: { argb: "FFFFFFFF" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
      });

      worksheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
      worksheet.autoFilter = { from: "A1", to: `G${dataToExport.length + 1}` };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rcv-audit-trail-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      clearTimeout(progressTimer);
      if (progressToastId !== null) {
        toast.dismiss(progressToastId);
      }
      toast.success("Excel exported");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export activities");
    }
  };

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    if (sortBy === "compliance") {
      filtered = filtered.filter((l) => l.actionType === "COMPLIANCE_REPORT");
    } else if (sortBy === "scans") {
      filtered = filtered.filter((l) => l.actionType === "SCAN_PRODUCT");
    }
    
    if (sortBy === "action") {
      return [...filtered].sort((a, b) => a.action.localeCompare(b.action));
    }
    
    return filtered;
  }, [logs, sortBy]);

  const sortedAllLogs = useMemo(() => {
    let filtered = allLogs;
    if (sortBy === "compliance") {
      filtered = filtered.filter((l) => l.actionType === "COMPLIANCE_REPORT");
    } else if (sortBy === "scans") {
      filtered = filtered.filter((l) => l.actionType === "SCAN_PRODUCT");
    }
    
    if (sortBy === "action") {
      return [...filtered].sort((a, b) => a.action.localeCompare(b.action));
    }
    
    return filtered;
  }, [allLogs, sortBy]);

  const columns = [
    {
      key: "createdAt",
      label: "Date/Time",
      sortable: true,
      render: (_, row: any) => (
        <span className="text-sm text-neutral-600">
          {new Date(row.createdAt).toLocaleDateString()}
          <br />
          {new Date(row.createdAt).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: "personName",
      label: "Person",
      sortable: true,
      render: (_, row: any) => (
        <span className="text-sm font-medium text-neutral-900">
          {row.personName}
        </span>
      ),
    },
    {
      key: "personEmail",
      label: "Email",
      sortable: true,
      render: (_, row: any) => (
        <span className="text-sm text-neutral-500">
          {row.personEmail}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (_, row: any) => (
        <span className="text-sm text-neutral-900 block max-w-sm truncate" title={row.action}>
          {row.action}
        </span>
      ),
    },
    {
      key: "actionType",
      label: "Type",
      sortable: true,
      render: (_, row: any) => (
        <span className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-md">
          {row.actionType}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, row: any) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedLog(row);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Audit Trail" description="Master activity log across all users and actions in the system.">
      <Card className="w-full overflow-hidden">
        <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-auto">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">Global Activity Log</h2>
              {loading && (
                <div className="scale-75 origin-left">
                  <LoadingSpinner size="sm" showText={false} />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="activity-sort" className="text-sm text-neutral-600 hidden sm:block">
                View:
              </label>
              <select
                id="activity-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
              >
                <option value="all">All Logs</option>
                <option value="action">Action (A–Z)</option>
                <option value="compliance">Compliance Reports</option>
                <option value="scans">Scanned Products</option>
              </select>
              
              <Button variant="outline" onClick={handleExport} disabled={sortedAllLogs.length === 0}>
                Export Excel
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredLogs.map(log => ({
              ...log,
              personName: log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
              personEmail: log.user?.email || "- System -"
            }))}
            loading={loading}
            emptyStateTitle="No Activities Found"
            emptyStateDescription="System activities will appear here."
            showSearch={true}
            searchPlaceholder="Search audit logs..."
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              Showing {filteredLogs.length} of {pagination.total_items} items • Page {pagination.current_page} of {pagination.total_pages}
            </div>

            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      pagination.current_page > 1 &&
                      setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }))
                    }
                    className={pagination.current_page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                <PaginationItem>
                  <span className="px-4 text-sm font-medium">Page {pagination.current_page}</span>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      pagination.current_page < pagination.total_pages &&
                      setPagination((prev) => ({ ...prev, current_page: prev.current_page + 1 }))
                    }
                    className={pagination.current_page >= pagination.total_pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">User</p>
                <p className="text-base font-semibold text-neutral-900">
                  {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName} (${selectedLog.user.email})` : "System/Unknown"}
                </p>
              </div>
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">Action</p>
                <p className="text-base font-semibold text-neutral-900">{selectedLog.action}</p>
              </div>

              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">Type</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${AuditLogService.getActionTypeBadge(selectedLog.actionType).className}`}>
                  {AuditLogService.getActionTypeBadge(selectedLog.actionType).label}
                </span>
              </div>

              <div className="border-b pb-3 flex justify-between">
                <div>
                    <p className="text-sm font-medium text-neutral-500 mb-1">Platform</p>
                    <p className="text-sm text-neutral-900">{selectedLog.platform || "N/A"}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-500 mb-1">Date & Time</p>
                    <p className="text-sm text-neutral-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-2">Additional Application Data</p>
                  <pre className="bg-neutral-50 p-3 rounded-lg text-xs overflow-x-auto border border-neutral-100 whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
