import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MetaMaskService, 
  type BlockchainCertificate, 
  type BlockchainCertificateDetail 
} from "@/services/metaMaskService";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent} from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  FileCheck, 
  Building2, 
  Package, 
  Link as LinkIcon,
  ExternalLink,
  X,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  Search,
  BarChart3,
  List,
  Globe,
  FileDown,
  Database,
} from "lucide-react";
import { toast } from "react-toastify";
import { generateBlockchainCertificatePDF } from "@/utils/generateBlockchainCertificatePDF";

interface BlockchainStats {
  totalCertificates: number;
  productCertificates: number;
  companyCertificates: number;
  chainIntegrity: boolean;
  latestCertificate?: {
    entityName: string;
    entityType: string;
    certificateId: string;
    sepoliaTransactionId: string;
  };
}

export function Blockchain() {
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [certificates, setCertificates] = useState<BlockchainCertificate[]>([]);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const pageSize = 20;

  // Certificate detail modal state
  const [selectedCertificate, setSelectedCertificate] = useState<BlockchainCertificateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Sepolia status
  const [sepoliaStatus, setSepoliaStatus] = useState<any>(null);
  const [sepoliaLoading, setSepoliaLoading] = useState(false);
  const [sepoliaError, setSepoliaError] = useState<string | null>(null);

  // Transaction verification
  const [txHash, setTxHash] = useState("");
  const [txVerifying, setTxVerifying] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === "sepolia") {
      fetchSepoliaStatus();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch certificates from Sepolia-verified products/companies
    const certResponse = await MetaMaskService.getBlockchainCertificates(
      currentPage,
      pageSize
    );
    if (certResponse.success) {
      setCertificates(certResponse.certificates);
      setPagination(certResponse.pagination);
    }

    // Fetch blockchain stats
    const statsResponse = await MetaMaskService.getBlockchainStats();
    if (statsResponse.success && statsResponse.stats) {
      setStats(statsResponse.stats);
    }

    setLoading(false);
  };

  const fetchSepoliaStatus = async () => {
    setSepoliaLoading(true);
    setSepoliaError(null);
    try {
      const status = await MetaMaskService.getSepoliaStatus();
      if (status.success) {
        setSepoliaStatus(status.data);
      } else {
        setSepoliaError(status.error || "Failed to fetch Sepolia status");
      }
    } catch (error: any) {
      console.error("Error fetching Sepolia status:", error);
      setSepoliaError(error.message || "Failed to fetch Sepolia status");
    } finally {
      setSepoliaLoading(false);
    }
  };

  const handleCertificateClick = async (certificate: BlockchainCertificate) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    
    try {
      const result = await MetaMaskService.getBlockchainCertificateById(
        certificate.entityType,
        certificate.id
      );
      if (result.success && result.certificate) {
        setSelectedCertificate(result.certificate);
      } else {
        toast.error("Failed to load certificate details");
      }
    } catch (error) {
      console.error("Error fetching certificate:", error);
      toast.error("Failed to load certificate details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied!`);
  };

  const handleVerifyTransaction = async () => {
    if (!txHash.trim()) {
      toast.error("Please enter a transaction hash");
      return;
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) {
      toast.error("Invalid transaction hash format");
      return;
    }

    setTxVerifying(true);
    setTxResult(null);

    try {
      // Use the public endpoint to get certificate directly from blockchain
      const result = await MetaMaskService.getPublicCertificateFromBlockchain(txHash.trim());
      setTxResult(result);
      
      if (result.success && result.certificate) {
        toast.success("Certificate recovered from blockchain!");
      } else {
        toast.error(result.error || "Certificate not found");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setTxVerifying(false);
    }
  };

  const columns: Column[] = [
    {
      key: "certificateId",
      label: "Certificate ID",
      render: (value: string, row: BlockchainCertificate) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleCertificateClick(row);
          }}
          className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
        >
          {value}
        </button>
      ),
    },
    {
      key: "entityType",
      label: "Type",
      render: (value: string) => (
        <Badge variant={value === "company" ? "default" : "secondary"}>
          {value === "company" ? (
            <>
              <Building2 className="h-3 w-3 mr-1" /> Company
            </>
          ) : (
            <>
              <Package className="h-3 w-3 mr-1" /> Product
            </>
          )}
        </Badge>
      ),
    },
    {
      key: "entityName",
      label: "Entity",
      render: (value: string, row: BlockchainCertificate) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleCertificateClick(row);
          }}
          className="whitespace-normal break-words text-left hover:text-blue-600"
        >
          {value}
        </button>
      ),
    },
    {
      key: "sepoliaTransactionId",
      label: "Sepolia Tx",
      render: (value: string) => (
        <a
          href={`https://sepolia.etherscan.io/tx/${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {value ? `${value.slice(0, 10)}...` : '-'}
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    {
      key: "issuedDate",
      label: "Issued",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (_: any, row: BlockchainCertificate) => (
        <Badge variant={row.sepoliaTransactionId ? "default" : "secondary"}>
          {row.sepoliaTransactionId ? "✓ Verified" : "Pending"}
        </Badge>
      ),
    },
  ];

  const totalPages = pagination ? pagination.total_pages : 1;

  return (
    <PageContainer
      title="Blockchain Dashboard"
      description="Sepolia blockchain certificate records and verification"
      headerAction={
        <Button onClick={() => navigate('/blockchain-recovery')} variant="outline">
          <Database className="h-4 w-4 mr-2" />
          Blockchain Recovery
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* View Toggle - Dropdown on mobile, button group on desktop */}
        <div className="w-full mb-4">
          {/* Mobile: Dropdown */}
          <div className="sm:hidden">
            <Select
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {activeTab === "overview" && <><BarChart3 className="h-4 w-4" /> Overview</>}
                    {activeTab === "certificates" && <><List className="h-4 w-4" /> Certificates</>}
                    {activeTab === "sepolia" && <><Globe className="h-4 w-4" /> Sepolia</>}
                    {activeTab === "verify" && <><Shield className="h-4 w-4" /> Verify</>}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Overview
                  </div>
                </SelectItem>
                <SelectItem value="certificates">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" /> Certificates
                  </div>
                </SelectItem>
                <SelectItem value="sepolia">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Sepolia
                  </div>
                </SelectItem>
                <SelectItem value="verify">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Verify
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Button group */}
          <div className="hidden sm:flex border rounded-lg w-full">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("overview")}
              className="rounded-r-none cursor-pointer flex-1"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeTab === "certificates" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("certificates")}
              className="rounded-none border-l cursor-pointer flex-1"
            >
              <List className="h-4 w-4 mr-2" />
              Certificates
            </Button>
            <Button
              variant={activeTab === "sepolia" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("sepolia")}
              className="rounded-none border-l cursor-pointer flex-1"
            >
              <Globe className="h-4 w-4 mr-2" />
              Sepolia
            </Button>
            <Button
              variant={activeTab === "verify" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("verify")}
              className="rounded-l-none border-l cursor-pointer flex-1"
            >
              <Shield className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Total Verified</p>
                    <p className="text-xl font-bold">{stats?.totalCertificates || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Companies</p>
                    <p className="text-xl font-bold">{stats?.companyCertificates || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Products</p>
                    <p className="text-xl font-bold">{stats?.productCertificates || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Network</p>
                    <p className="text-xl font-bold">Sepolia</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chain Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Sepolia Blockchain Status</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-neutral-600">Connected</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500">Network</p>
                  <p className="font-semibold text-purple-600">Sepolia Testnet</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500">Chain ID</p>
                  <p className="font-semibold">11155111</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500">Total Certificates</p>
                  <p className="font-semibold">{stats?.totalCertificates || 0}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500">Verification Status</p>
                  <p className="font-semibold text-green-600">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Certificate */}
          {stats?.latestCertificate && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Latest Certificate</h3>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg text-green-900">
                        {stats.latestCertificate.entityName}
                      </p>
                      <p className="text-xs text-green-700 font-mono mt-1">
                        {stats.latestCertificate.certificateId}
                      </p>
                    </div>
                    <Badge variant={stats.latestCertificate.entityType === 'company' ? 'default' : 'secondary'}>
                      {stats.latestCertificate.entityType === 'company' ? (
                        <><Building2 className="h-3 w-3 mr-1" /> Company</>
                      ) : (
                        <><Package className="h-3 w-3 mr-1" /> Product</>
                      )}
                    </Badge>
                  </div>
                  {stats.latestCertificate.sepoliaTransactionId && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${stats.latestCertificate.sepoliaTransactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                    >
                      View on Etherscan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <DataTable
              title="Blockchain Certificates"
              columns={columns}
              data={certificates}
              searchPlaceholder="Search certificates..."
              loading={loading}
              emptyStateTitle="No Certificates Found"
              emptyStateDescription="Blockchain-verified certificates will appear here once products or companies are registered with blockchain verification."
            />

            {pagination && (
              <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="hidden sm:block">
                  <span className="text-sm text-neutral-600">
                    Page {currentPage} of {totalPages} ({pagination.total_items} total)
                  </span>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={pagination.total_items}
                  itemsPerPage={pageSize}
                  onPageChange={setCurrentPage}
                  showingPosition="right"
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sepolia Tab */}
        <TabsContent value="sepolia" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Sepolia Testnet Status</h3>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSepoliaStatus}
                  disabled={sepoliaLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${sepoliaLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {sepoliaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                  <span className="ml-3 text-neutral-600">Connecting to Sepolia...</span>
                </div>
              ) : sepoliaError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Connection Error</p>
                    <p className="text-sm text-red-600">{sepoliaError}</p>
                  </div>
                </div>
              ) : sepoliaStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${sepoliaStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`font-semibold ${sepoliaStatus.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                          {sepoliaStatus.isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">Network</p>
                      <p className="font-semibold">{sepoliaStatus.networkName || 'Sepolia'}</p>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">Chain ID</p>
                      <p className="font-semibold font-mono">{sepoliaStatus.chainId || '11155111'}</p>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">Balance</p>
                      <p className="font-semibold">{sepoliaStatus.balance || '0'} ETH</p>
                    </div>
                  </div>

                  {sepoliaStatus.walletAddress && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-600 mb-1">Server Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-purple-800 break-all">
                          {sepoliaStatus.walletAddress}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(sepoliaStatus.walletAddress, 'Wallet address')}
                        >
                          {copied === 'Wallet address' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Click refresh to load Sepolia status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Blockchain-Based Verification</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This verification works <strong>directly from the Sepolia blockchain</strong>. 
                    Even if our database is compromised or deleted, certificate records remain 
                    permanently on the blockchain and can always be recovered.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Search className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Recover Certificate from Blockchain</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-600 mb-2 block">
                    Enter Sepolia Transaction Hash
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="0x..."
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      className="font-mono"
                    />
                    <Button 
                      onClick={handleVerifyTransaction}
                      disabled={txVerifying}
                    >
                      {txVerifying ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      Recover
                    </Button>
                  </div>
                </div>

                {txResult && (
                  <div className={`p-4 rounded-lg border ${
                    txResult.success && txResult.certificate
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {txResult.success && txResult.certificate ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">Certificate Recovered from Blockchain!</span>
                        </div>
                        
                        {/* Certificate Info */}
                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-lg">{txResult.certificate.entityName}</h4>
                            <Badge variant={txResult.certificate.entityType === 'company' ? 'default' : 'secondary'}>
                              {txResult.certificate.entityType === 'company' ? (
                                <><Building2 className="h-3 w-3 mr-1" /> Company</>
                              ) : (
                                <><Package className="h-3 w-3 mr-1" /> Product</>
                              )}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-neutral-500">Certificate ID</p>
                              <p className="font-mono text-xs">{txResult.certificate.certificateId}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500">Block Number</p>
                              <p className="font-mono">{txResult.certificate.blockNumber}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500">Timestamp</p>
                              <p>{new Date(txResult.certificate.blockTimestamp || txResult.certificate.timestamp).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500">Version</p>
                              <p>{txResult.certificate.version}</p>
                            </div>
                          </div>

                          {/* PDF Hash */}
                          <div className="mt-4 p-3 bg-neutral-50 rounded">
                            <p className="text-xs text-neutral-500 mb-1">PDF Hash (SHA-256)</p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono break-all">{txResult.certificate.pdfHash}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(txResult.certificate.pdfHash, 'PDF Hash')}
                              >
                                {copied === 'PDF Hash' ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Verification Note */}
                        {txResult.certificate.verificationNote && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
                            <strong>Note:</strong> {txResult.certificate.verificationNote}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          <Button
                            onClick={() => {
                              generateBlockchainCertificatePDF({
                                entityName: txResult.certificate.entityName,
                                entityType: txResult.certificate.entityType,
                                certificateId: txResult.certificate.certificateId,
                                pdfHash: txResult.certificate.pdfHash,
                                timestamp: txResult.certificate.timestamp,
                                blockNumber: txResult.certificate.blockNumber,
                                blockTimestamp: txResult.certificate.blockTimestamp,
                                transactionHash: txHash,
                                version: txResult.certificate.version
                              });
                              toast.success("PDF certificate generated!");
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            Generate PDF Certificate
                          </Button>
                          
                          <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                          >
                            View on Etherscan <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-800">
                          {txResult.error || 'Certificate not found or invalid transaction'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certificate Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Certificate Details</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCertificate(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {detailLoading ? (
              <div className="p-8 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : selectedCertificate ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedCertificate.entityName}</h3>
                    <p className="text-sm text-neutral-500 font-mono mt-1">
                      {selectedCertificate.certificateId}
                    </p>
                  </div>
                  <Badge variant={selectedCertificate.entityType === 'company' ? 'default' : 'secondary'}>
                    {selectedCertificate.entityType === 'company' ? (
                      <><Building2 className="h-3 w-3 mr-1" /> Company</>
                    ) : (
                      <><Package className="h-3 w-3 mr-1" /> Product</>
                    )}
                  </Badge>
                </div>

                {/* Sepolia Transaction - PROMINENT */}
                {selectedCertificate.sepoliaTransactionId && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-purple-800">Sepolia Blockchain Verification</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-purple-600">Transaction Hash</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-purple-800 break-all">
                            {selectedCertificate.sepoliaTransactionId}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(selectedCertificate.sepoliaTransactionId!, 'Transaction hash')}
                          >
                            {copied === 'Transaction hash' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      {selectedCertificate.etherscanUrl && (
                        <a
                          href={selectedCertificate.etherscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm"
                        >
                          View on Etherscan <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Issue Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(selectedCertificate.issuedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Status</p>
                    <Badge variant={selectedCertificate.sepoliaTransactionId ? 'default' : 'secondary'}>
                      {selectedCertificate.sepoliaTransactionId ? '✓ Verified on Sepolia' : 'Pending'}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                {selectedCertificate.details && (
                  <div>
                    <h4 className="font-semibold text-sm text-neutral-700 mb-3">
                      {selectedCertificate.entityType === 'product' ? 'Product Details' : 'Company Details'}
                    </h4>
                    <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(selectedCertificate.details).map(([key, value]) => (
                        value && (
                          <div key={key}>
                            <p className="text-xs text-neutral-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="font-medium">
                              {typeof value === 'object' 
                                ? JSON.stringify(value)
                                : value instanceof Date
                                  ? new Date(value).toLocaleDateString()
                                  : String(value)
                              }
                            </p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate PDF Button */}
                {selectedCertificate.sepoliaTransactionId && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={async () => {
                        // Fetch full data from blockchain to generate PDF
                        const result = await MetaMaskService.getPublicCertificateFromBlockchain(
                          selectedCertificate.sepoliaTransactionId!
                        );
                        if (result.success && result.certificate) {
                          generateBlockchainCertificatePDF({
                            entityName: result.certificate.entityName,
                            entityType: result.certificate.entityType,
                            certificateId: result.certificate.certificateId,
                            pdfHash: result.certificate.pdfHash,
                            timestamp: result.certificate.timestamp,
                            blockNumber: result.certificate.blockNumber,
                            blockTimestamp: result.certificate.blockTimestamp,
                            transactionHash: selectedCertificate.sepoliaTransactionId!,
                            version: result.certificate.version
                          });
                          toast.success("PDF certificate generated!");
                        } else {
                          toast.error("Failed to fetch certificate data from blockchain");
                        }
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Generate Blockchain Certificate PDF
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500">
                Failed to load certificate details
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
