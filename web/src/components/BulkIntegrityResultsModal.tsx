import { useState, useMemo } from "react";
import { X, CheckCircle2, AlertCircle, XCircle, Trash2, FileSpreadsheet, RotateCcw, Link, Search, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegrityService, type BulkIntegrityResult } from "@/services/integrityService";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

interface BulkIntegrityResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkResult?: BulkIntegrityResult | null;
  isLoading?: boolean;
  onRefreshRequested: () => void;
}

export function BulkIntegrityResultsModal({
  isOpen,
  onClose,
  bulkResult,
  isLoading = false,
  onRefreshRequested,
}: BulkIntegrityResultsModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"status" | "name">("status");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading) {
      if (window.confirm("Are you sure you want to close? The integrity check will continue in the background but you will have to repeat the process to see the results.")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleRevert = async (productId: string) => {
    try {
      setProcessingId(productId);
      const result = await IntegrityService.revertProductIntegrity(productId);
      if (result.success) {
        toast.success(result.message);
        onRefreshRequested();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to revert product");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestore = async (productId: string, txHash: string) => {
    try {
      setProcessingId(productId);
      const result = await IntegrityService.restoreDeletedProduct(productId, txHash);
      if ('success' in result && result.success) {
        toast.success(result.message);
        onRefreshRequested();
      } else {
        toast.error((result as any).message || 'Failed to restore');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to restore product");
    } finally {
      setProcessingId(null);
    }
  };

  const downloadExcel = () => {
    if (!bulkResult) return;
    try {
      const detailRows: Record<string, string>[] = [];
      for (const product of bulkResult.results) {
        if (!product.fields || product.fields.length === 0) {
           // For data_loss or no_blockchain where fields might be empty, just push one row
           detailRows.push({
            'Product Name': product.productName,
            'Product ID': product.productId,
            'Status': product.status.toUpperCase(),
            'Field': 'N/A',
            'Current DB Value': '—',
            'Original Blockchain Value': '—',
            'Match': 'N/A',
            'Tx Hash': product.txHash || '',
            'Etherscan URL': product.etherscanUrl || '',
          });
        } else {
          for (const field of product.fields) {
            detailRows.push({
              'Product Name': product.productName,
              'Product ID': product.productId,
              'Status': product.status.toUpperCase(),
              'Field': field.label,
              'Current DB Value': field.dbValue || '—',
              'Original Blockchain Value': field.blockchainValue || '—',
              'Match': field.match ? 'Yes' : 'NO — ALTERED',
              'Tx Hash': product.txHash || '',
              'Etherscan URL': product.etherscanUrl || '',
            });
          }
        }
      }

      const wb = XLSX.utils.book_new();
      
      if (detailRows.length > 0) {
        const detailWs = XLSX.utils.json_to_sheet(detailRows);
        detailWs['!cols'] = [
          { wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 20 },
          { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 65 }, { wch: 75 }
        ];
        XLSX.utils.book_append_sheet(wb, detailWs, "Full Data Report");
      } else {
        const emptyWs = XLSX.utils.json_to_sheet([{ Message: 'No data available' }]);
        XLSX.utils.book_append_sheet(wb, emptyWs, "Full Data Report");
      }

      XLSX.writeFile(wb, `RCV_Integrity_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel report downloaded successfully");
    } catch (err) {
      console.error("Error generating Excel:", err);
      toast.error("Failed to generate Excel report");
    }
  };

  const hasIssues = bulkResult ? bulkResult.tamperedCount > 0 || bulkResult.dataLossCount > 0 : false;

  const filteredAndSortedItems = useMemo(() => {
    if (!bulkResult || !bulkResult.results) return [];
    
    return [...bulkResult.results]
      .filter(item => {
        if (item.status === 'intact' || item.status === 'no_blockchain') return false;
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
          item.productName.toLowerCase().includes(lowerSearch) || 
          item.productId.toLowerCase().includes(lowerSearch) || 
          (item.txHash && item.txHash.toLowerCase().includes(lowerSearch))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'status') {
          const statusScoreA = a.status === 'data_loss' ? 2 : 1;
          const statusScoreB = b.status === 'data_loss' ? 2 : 1;
          return sortOrder === 'desc' ? statusScoreB - statusScoreA : statusScoreA - statusScoreB;
        }
        if (sortBy === 'name') {
          return sortOrder === 'desc' 
            ? b.productName.localeCompare(a.productName) 
            : a.productName.localeCompare(b.productName);
        }
        return 0;
      });
  }, [bulkResult, searchTerm, sortBy, sortOrder]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${
          isLoading ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50' :
          hasIssues ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/50'
        }`}>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            ) : hasIssues ? (
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            )}
            <div>
              <h2 className={`font-semibold text-lg ${
                isLoading ? 'text-blue-900 dark:text-blue-100' :
                hasIssues ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'
              }`}>
                {isLoading ? "Checking Integrity..." : "Bulk Integrity Check Results"}
              </h2>
              <p className={`text-sm ${
                isLoading ? 'text-blue-700 dark:text-blue-300' :
                hasIssues ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
              }`}>
                {isLoading ? "Comparing database records with the Sepolia blockchain." : hasIssues ? "Issues detected in the database" : "All blockchain-synced products are intact!"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">Validation in Progress</h3>
              <p className="text-gray-500 max-w-sm mt-2">
                We are currently scanning all database records and comparing them with their original blockchain certificates. This may take a few moments.
              </p>
            </div>
          ) : bulkResult ? (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
                  <span className="text-2xl font-bold text-green-700 dark:text-green-400">{bulkResult.intactCount}</span>
                  <span className="text-xs text-green-600 dark:text-green-500 font-medium">Intact</span>
                </div>
                <div className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600 mb-1" />
                  <span className="text-2xl font-bold text-red-700 dark:text-red-400">{bulkResult.tamperedCount}</span>
                  <span className="text-xs text-red-600 dark:text-red-500 font-medium">Tampered</span>
                </div>
                <div className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-700 mb-1" />
                  <span className="text-2xl font-bold text-red-800 dark:text-red-400">{bulkResult.dataLossCount}</span>
                  <span className="text-xs text-red-700 dark:text-red-500 font-medium">Missing</span>
                </div>
                <div className="p-3 rounded-lg border bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50 flex flex-col items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mb-1" />
                  <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">{bulkResult.noBlockchainCount}</span>
                  <span className="text-xs text-yellow-600 dark:text-yellow-600 font-medium text-center">Unsynced</span>
                </div>
                <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-gray-400 mb-1" />
                  <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">{bulkResult.errorCount}</span>
                  <span className="text-xs text-gray-500 font-medium">Errors</span>
                </div>
              </div>

              {/* Issue List */}
              {filteredAndSortedItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Affected Products ({filteredAndSortedItems.length})
                    </h3>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                      <div className="relative w-full sm:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input 
                          placeholder="Search..." 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div className="flex border rounded-md overflow-hidden text-xs bg-white dark:bg-gray-900">
                        <button 
                          className={`px-2 py-1.5 ${sortBy === 'status' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'} transition-colors border-r`}
                          onClick={() => {
                            if (sortBy === 'status') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                            else setSortBy('status');
                          }}
                        >
                          Status {sortBy === 'status' && (sortOrder === 'desc' ? '↑' : '↓')}
                        </button>
                        <button 
                          className={`px-2 py-1.5 ${sortBy === 'name' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'} transition-colors`}
                          onClick={() => {
                            if (sortBy === 'name') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                            else setSortBy('name');
                          }}
                        >
                          Name {sortBy === 'name' && (sortOrder === 'desc' ? '↑' : '↓')}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y max-h-[50vh] overflow-y-auto">
                    {filteredAndSortedItems.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center">
                        <CheckCircle2 className="h-8 w-8 text-green-400 mb-2 opacity-30" />
                        No matching tampered products found.
                      </div>
                    ) : (
                      filteredAndSortedItems.map(r => {
                        const isExpanded = expandedId === r.productId;
                        return (
                          <div key={r.productId} className="flex flex-col">
                            <div 
                              className={`p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors cursor-pointer group ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                              onClick={() => setExpandedId(isExpanded ? null : r.productId)}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />}
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{r.productName}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                      r.status === 'data_loss' 
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' 
                                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                                    }`}>
                                      {r.status === 'data_loss' ? 'Missing' : 'Tampered'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 pl-6">
                                    <span className="font-mono">{r.productId.substring(0, 12)}...</span>
                                    {r.etherscanUrl && (
                                      <a href={r.etherscanUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                                        <Link className="h-3 w-3" /> View Tx
                                      </a>
                                    )}
                                    <span className="text-red-500 font-medium">
                                      {r.status === 'data_loss' ? 'Deleted from database' : `${r.mismatchCount} field(s) altered`}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="shrink-0 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                                  {r.status === 'data_loss' ? (
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                                      onClick={() => r.txHash && handleRestore(r.productId, r.txHash)}
                                      disabled={!r.txHash || processingId === r.productId}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      {processingId === r.productId ? "Restoring..." : "Restore to DB"}
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                                      onClick={() => handleRevert(r.productId)}
                                      disabled={processingId === r.productId}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      {processingId === r.productId ? "Reverting..." : "Revert Data"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded Detail View */}
                            {isExpanded && r.status === 'tampered' && (
                              <div className="bg-gray-50 dark:bg-gray-800 border-t p-4 text-xs">
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Altered Fields Breakdown</h4>
                                <div className="space-y-2">
                                  {r.fields?.filter(f => !f.match).map(f => (
                                    <div key={f.label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white dark:bg-gray-900 border rounded-md p-2">
                                      <div className="font-medium text-gray-900 dark:text-gray-100">{f.label}</div>
                                      <div>
                                        <span className="block text-[10px] text-gray-500 uppercase">Original Blockchain Value</span>
                                        <span className="text-green-600 dark:text-green-400 truncate block font-mono" title={String(f.blockchainValue)}>{String(f.blockchainValue)}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[10px] text-gray-500 uppercase">Current DB Value</span>
                                        <span className="text-red-600 dark:text-red-400 line-through truncate block font-mono" title={String(f.dbValue)}>{String(f.dbValue)}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {(!r.fields || r.fields.filter(f => !f.match).length === 0) && (
                                    <span className="text-gray-500 italic">No field details available or mismatch is structural.</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button
            variant="outline"
            onClick={downloadExcel}
            disabled={!bulkResult}
            className="w-full sm:w-auto bg-white dark:bg-gray-800"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Download Excel Report
          </Button>
          <Button onClick={handleClose} variant="secondary" className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
