import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RefreshCw, 
  Database, 
  Link2, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Search,
  Shield,
  HardDrive,
  ExternalLink,
  Wallet,
  Info,
  Download,
  Hammer,
  Building2,
  Package
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'react-toastify';
import BlockchainRecoveryService from '@/services/blockchainRecoveryService';
import type {
  RecoveryStatus,
  RecoveryResult,
  VerificationResult,
  WalletInfo,
  TransactionRecoveryResult,
  RecoveredCertificate
} from '@/services/blockchainRecoveryService';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface Company {
  _id: string;
  name: string;
  licenseNumber: string;
}

export function BlockchainRecovery() {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [txHashToVerify, setTxHashToVerify] = useState('');
  const [singleRecoveryResult, setSingleRecoveryResult] = useState<TransactionRecoveryResult | null>(null);
  const [loading, setLoading] = useState({
    status: false,
    recovery: false,
    verification: false,
    singleRecovery: false,
    rebuild: false
  });

  // Rebuild modal state
  const [showRebuildModal, setShowRebuildModal] = useState(false);
  const [rebuildRecord, setRebuildRecord] = useState<RecoveredCertificate | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rebuildForm, setRebuildForm] = useState({
    address: '',
    licenseNumber: '',
    phone: '',
    email: '',
    website: '',
    businessType: '',
    description: '',
    LTONumber: '',
    CFPRNumber: '',
    lotNumber: '',
    productClassification: '',
    productSubClassification: '',
    expirationDate: '',
    companyId: ''
  });

  useEffect(() => {
    fetchStatus();
    fetchWalletInfo();
  }, []);

  const fetchStatus = async () => {
    setLoading(prev => ({ ...prev, status: true }));
    try {
      const data = await BlockchainRecoveryService.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
      toast.error('Failed to fetch recovery status');
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  };

  const fetchWalletInfo = async () => {
    try {
      const data = await BlockchainRecoveryService.getWalletInfo();
      setWalletInfo(data);
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(API_URL + '/company', { withCredentials: true });
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const triggerRecovery = async () => {
    setLoading(prev => ({ ...prev, recovery: true }));
    setRecoveryResult(null);
    try {
      const result = await BlockchainRecoveryService.triggerRecovery();
      setRecoveryResult(result);
      toast.success('Blockchain recovery completed!');
      await fetchStatus();
    } catch (error) {
      console.error('Error during recovery:', error);
      toast.error('Blockchain recovery failed');
    } finally {
      setLoading(prev => ({ ...prev, recovery: false }));
    }
  };

  const verifyTransaction = async () => {
    if (!txHashToVerify || !txHashToVerify.startsWith('0x')) {
      toast.error('Please enter a valid transaction hash (starting with 0x)');
      return;
    }
    
    setLoading(prev => ({ ...prev, verification: true }));
    setVerificationResult(null);
    setSingleRecoveryResult(null);
    try {
      const result = await BlockchainRecoveryService.verifyTransaction(txHashToVerify);
      setVerificationResult(result);
      if (result.exists) {
        toast.success('Transaction verified on blockchain!');
      } else {
        toast.warning('Transaction not found or invalid');
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error('Verification failed');
    } finally {
      setLoading(prev => ({ ...prev, verification: false }));
    }
  };

  const recoverSingleTransaction = async () => {
    if (!txHashToVerify || !txHashToVerify.startsWith('0x')) {
      toast.error('Please enter a valid transaction hash (starting with 0x)');
      return;
    }
    
    setLoading(prev => ({ ...prev, singleRecovery: true }));
    setSingleRecoveryResult(null);
    try {
      const result = await BlockchainRecoveryService.recoverTransaction(txHashToVerify);
      setSingleRecoveryResult(result);
      if (result.success && result.recoveredEntityId) {
        toast.success(result.entityType + ' recovered successfully!');
        await fetchStatus();
      } else if (result.success) {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error recovering transaction:', error);
      toast.error('Recovery failed');
    } finally {
      setLoading(prev => ({ ...prev, singleRecovery: false }));
    }
  };

  const openRebuildModal = (record: RecoveredCertificate) => {
    setRebuildRecord(record);
    
    // Pre-fill form with blockchain data if available (v2.0+)
    const entityData = record.entityData;
    
    if (record.entityType === 'company' && entityData) {
      setRebuildForm({
        address: entityData.address || '',
        licenseNumber: entityData.licenseNumber || '',
        phone: entityData.phone || '',
        email: entityData.email || '',
        website: '',
        businessType: entityData.businessType || '',
        description: '',
        LTONumber: '',
        CFPRNumber: '',
        lotNumber: '',
        productClassification: '',
        productSubClassification: '',
        expirationDate: '',
        companyId: ''
      });
    } else if (record.entityType === 'product' && entityData) {
      setRebuildForm({
        address: '',
        licenseNumber: '',
        phone: '',
        email: '',
        website: '',
        businessType: '',
        description: '',
        LTONumber: entityData.LTONumber || '',
        CFPRNumber: entityData.CFPRNumber || '',
        lotNumber: entityData.lotNumber || '',
        productClassification: entityData.classification || '',
        productSubClassification: entityData.subClassification || '',
        expirationDate: entityData.expirationDate ? entityData.expirationDate.split('T')[0] : '',
        companyId: ''
      });
      fetchCompanies();
    } else {
      // No entity data - empty form
      setRebuildForm({
        address: '',
        licenseNumber: '',
        phone: '',
        email: '',
        website: '',
        businessType: '',
        description: '',
        LTONumber: '',
        CFPRNumber: '',
        lotNumber: '',
        productClassification: '',
        productSubClassification: '',
        expirationDate: '',
        companyId: ''
      });
      if (record.entityType === 'product') {
        fetchCompanies();
      }
    }
    
    setShowRebuildModal(true);
  };

  const handleRebuildSubmit = async () => {
    if (!rebuildRecord) return;

    setLoading(prev => ({ ...prev, rebuild: true }));
    
    try {
      const hasBlockchainData = rebuildRecord.entityData;
      const data: Record<string, unknown> = {
        txHash: rebuildRecord.txHash,
        entityType: rebuildRecord.entityType,
        name: rebuildRecord.entityName
      };

      if (rebuildRecord.entityType === 'company') {
        // For companies: use blockchain data if available, otherwise require form input
        const address = rebuildForm.address || rebuildRecord.entityData?.address;
        const license = rebuildForm.licenseNumber || rebuildRecord.entityData?.licenseNumber;
        
        if (!address || !license) {
          toast.error('Address and License Number are required');
          setLoading(prev => ({ ...prev, rebuild: false }));
          return;
        }
        data.address = address;
        data.licenseNumber = license;
        data.phone = rebuildForm.phone || rebuildRecord.entityData?.phone || undefined;
        data.email = rebuildForm.email || rebuildRecord.entityData?.email || undefined;
        data.website = rebuildForm.website || undefined;
        data.businessType = rebuildForm.businessType || rebuildRecord.entityData?.businessType || undefined;
        data.description = rebuildForm.description || undefined;
      } else {
        // For products: blockchain data + optional company selection
        // If blockchain has company info, companyId is optional (will auto-create)
        const needsCompany = !hasBlockchainData?.company && !rebuildForm.companyId;
        
        // Check required fields - use blockchain data as fallback
        const lto = rebuildForm.LTONumber || hasBlockchainData?.LTONumber;
        const cfpr = rebuildForm.CFPRNumber || hasBlockchainData?.CFPRNumber;
        const lot = rebuildForm.lotNumber || hasBlockchainData?.lotNumber;
        const classification = rebuildForm.productClassification || hasBlockchainData?.classification;
        const subClassification = rebuildForm.productSubClassification || hasBlockchainData?.subClassification;
        const expDate = rebuildForm.expirationDate || (hasBlockchainData?.expirationDate ? hasBlockchainData.expirationDate.split('T')[0] : '');
        
        if (!lto || !cfpr || !lot || !classification || !subClassification || !expDate) {
          toast.error('Missing required product fields');
          setLoading(prev => ({ ...prev, rebuild: false }));
          return;
        }
        
        if (needsCompany) {
          toast.error('Please select a company or ensure blockchain data contains company info');
          setLoading(prev => ({ ...prev, rebuild: false }));
          return;
        }
        
        data.brandName = hasBlockchainData?.brandName || rebuildRecord.entityName;
        data.productName = hasBlockchainData?.productName || rebuildRecord.entityName;
        data.LTONumber = lto;
        data.CFPRNumber = cfpr;
        data.lotNumber = lot;
        data.productClassification = classification;
        data.productSubClassification = subClassification;
        data.expirationDate = expDate;
        // Only send companyId if explicitly selected - otherwise backend will auto-create from blockchain
        if (rebuildForm.companyId) {
          data.companyId = rebuildForm.companyId;
        }
      }

      const result = await BlockchainRecoveryService.rebuildRecord(data as Parameters<typeof BlockchainRecoveryService.rebuildRecord>[0]);
      
      if (result.success) {
        toast.success(result.message);
        setShowRebuildModal(false);
        await fetchStatus();
        if (recoveryResult) {
          setRecoveryResult({
            ...recoveryResult,
            recoveredRecords: recoveryResult.recoveredRecords.filter(
              r => r.txHash !== rebuildRecord.txHash
            )
          });
        }
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      console.error('Error rebuilding record:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to rebuild record');
    } finally {
      setLoading(prev => ({ ...prev, rebuild: false }));
    }
  };

  const getSingleRecoveryResultClass = () => {
    if (!singleRecoveryResult) return '';
    if (singleRecoveryResult.success && singleRecoveryResult.recoveredEntityId) {
      return 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800';
    }
    if (singleRecoveryResult.success) {
      return 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800';
    }
    return 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Blockchain Recovery
          </h1>
          <p className="text-muted-foreground mt-1">
            Recover database records from the immutable blockchain - demonstrating blockchain persistence
          </p>
        </div>
        <Button variant="outline" onClick={fetchStatus} disabled={loading.status}>
          {loading.status ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh Status
        </Button>
      </div>

      {walletInfo && walletInfo.walletAddress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              Server Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <code className="bg-muted px-3 py-2 rounded text-sm flex-1 overflow-x-auto">
                {walletInfo.walletAddress}
              </code>
              <Badge variant="outline">{walletInfo.network}</Badge>
              {walletInfo.etherscanUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={walletInfo.etherscanUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Etherscan
                  </a>
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              All RCV certificates are registered under this wallet. You can verify all transactions on Etherscan.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blockchain Records</p>
                <p className="text-2xl font-bold">{status?.totalBlockchainRecords ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <HardDrive className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Database</p>
                <p className="text-2xl font-bold">{status?.recordsInDatabase ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Missing Records</p>
                <p className="text-2xl font-bold">{status?.missingRecords ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Link2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chain Status</p>
                <div className="text-2xl font-bold">
                  {status ? (
                    <Badge variant={status.missingRecords === 0 ? 'default' : 'secondary'}>
                      {status.missingRecords === 0 ? 'Synced' : 'Out of Sync'}
                    </Badge>
                  ) : '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Blockchain Recovery
          </CardTitle>
          <CardDescription>
            Scan all blockchain transactions and recover any missing records. This demonstrates that even if your 
            database is completely wiped, you can rebuild critical certification data from the immutable blockchain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong>How it works:</strong> All RCV certificates are stored on the Sepolia blockchain. When recovery 
              runs, we scan all transactions from the server wallet and compare them against your database. Any missing 
              records can be rebuilt using the blockchain data as the source of truth.
            </p>
          </div>

          <div className="mt-4">
            <Button onClick={triggerRecovery} disabled={loading.recovery} size="lg">
              {loading.recovery ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recovering from Blockchain...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Blockchain Recovery
                </>
              )}
            </Button>
          </div>

          {recoveryResult && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{recoveryResult.totalTransactionsScanned}</div>
                  <div className="text-xs text-muted-foreground">Transactions Scanned</div>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{recoveryResult.certificatesFound}</div>
                  <div className="text-xs text-muted-foreground">Certificates Found</div>
                </div>
                <div className="text-center p-3 bg-green-100 dark:bg-green-900 rounded">
                  <div className="text-2xl font-bold text-green-600">{recoveryResult.companiesRecovered}</div>
                  <div className="text-xs text-muted-foreground">Companies Recovered</div>
                </div>
                <div className="text-center p-3 bg-blue-100 dark:bg-blue-900 rounded">
                  <div className="text-2xl font-bold text-blue-600">{recoveryResult.productsRecovered}</div>
                  <div className="text-xs text-muted-foreground">Products Identified</div>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{recoveryResult.skippedExisting}</div>
                  <div className="text-xs text-muted-foreground">Already Existing</div>
                </div>
              </div>

              {recoveryResult.errors.length > 0 && (
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200">Errors During Recovery</h4>
                    <ul className="list-disc list-inside mt-2 text-sm text-red-700 dark:text-red-300">
                      {recoveryResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {recoveryResult.recoveredRecords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Hammer className="h-4 w-4" />
                    Records Available for Rebuild ({recoveryResult.recoveredRecords.length})
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    These records exist on the blockchain but not in the database. Click &quot;Rebuild&quot; to add them back with verified blockchain data.
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Entity Name</TableHead>
                          <TableHead>Certificate ID</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Original Date</TableHead>
                          <TableHead>Transaction</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recoveryResult.recoveredRecords.map((record, index) => {
                          const isOldFormat = record.certificateId?.startsWith('CERT-');
                          const hasFullData = record.version === '2.0' && record.entityData;
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant={record.entityType === 'company' ? 'default' : 'secondary'}>
                                  {record.entityType === 'company' ? (
                                    <><Building2 className="h-3 w-3 mr-1" /> Company</>
                                  ) : (
                                    <><Package className="h-3 w-3 mr-1" /> Product</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{record.entityName}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <code className="text-xs bg-muted px-2 py-1 rounded" title={record.certificateId || 'N/A'}>
                                    {record.certificateId ? (
                                      record.certificateId.length > 16 
                                        ? record.certificateId.substring(0, 16) + '...'
                                        : record.certificateId
                                    ) : 'N/A'}
                                  </code>
                                  {isOldFormat && (
                                    <Badge variant="outline" className="text-xs w-fit">Old Format</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant={hasFullData ? 'default' : 'outline'} className="text-xs w-fit">
                                    v{record.version || '1.0'}
                                  </Badge>
                                  {hasFullData && (
                                    <span className="text-xs text-green-600">Full data</span>
                                  )}
                                  {record.approvers && record.approvers.length > 0 && (
                                    <span className="text-xs text-purple-600">{record.approvers.length} approver{record.approvers.length > 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {record.originalTimestamp 
                                  ? new Date(record.originalTimestamp).toLocaleDateString()
                                  : new Date(record.blockTimestamp).toLocaleDateString()
                                }
                              </TableCell>
                              <TableCell>
                                <a 
                                  href={record.etherscanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline flex items-center gap-1 text-xs"
                                  title={record.txHash}
                                >
                                  {record.txHash.substring(0, 10)}...
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" onClick={() => openRebuildModal(record)}>
                                  <Hammer className="h-3 w-3 mr-1" />
                                  Rebuild
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Verify Transaction
          </CardTitle>
          <CardDescription>
            Enter a transaction hash to verify it exists on the blockchain and view stored certificate data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Enter transaction hash (0x...)"
              value={txHashToVerify}
              onChange={(e) => setTxHashToVerify(e.target.value)}
              className="flex-1"
            />
            <Button onClick={verifyTransaction} disabled={loading.verification}>
              {loading.verification ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
          </div>

          {verificationResult && (
            <div className="p-4 border rounded space-y-3">
              <div className="flex items-center gap-2">
                {verificationResult.exists ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-600">Transaction Verified on Blockchain</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-600">Transaction Not Found</span>
                  </>
                )}
              </div>

              {verificationResult.certificate && (
                <div className="space-y-4">
                  {/* Basic Certificate Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Certificate ID:</span>
                      <p className="font-mono text-xs">{verificationResult.certificate.certificateId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entity Type:</span>
                      <p className="flex items-center gap-2">
                        <Badge>{verificationResult.certificate.entityType}</Badge>
                        <Badge variant={verificationResult.certificate.version === '2.0' ? 'default' : 'outline'}>
                          v{verificationResult.certificate.version || '1.0'}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entity Name:</span>
                      <p className="font-medium">{verificationResult.certificate.entityName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Block Number:</span>
                      <p>{verificationResult.certificate.blockNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">PDF Hash (SHA-256):</span>
                      <p className="font-mono text-xs break-all bg-muted px-2 py-1 rounded mt-1">{verificationResult.certificate.pdfHash}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Block Timestamp:</span>
                      <p>{new Date(verificationResult.certificate.blockTimestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Original Registration:</span>
                      <p>{new Date(verificationResult.certificate.originalTimestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Entity Details (v2.0+) */}
                  {verificationResult.certificate.entityData && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        {verificationResult.certificate.entityType === 'company' ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                        Entity Details from Blockchain
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {verificationResult.certificate.entityType === 'product' ? (
                          <>
                            {verificationResult.certificate.entityData.LTONumber && (
                              <div><span className="text-muted-foreground">LTO Number:</span> <strong>{verificationResult.certificate.entityData.LTONumber}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.CFPRNumber && (
                              <div><span className="text-muted-foreground">CFPR Number:</span> <strong>{verificationResult.certificate.entityData.CFPRNumber}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.lotNumber && (
                              <div><span className="text-muted-foreground">Lot Number:</span> <strong>{verificationResult.certificate.entityData.lotNumber}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.brandName && (
                              <div><span className="text-muted-foreground">Brand:</span> <strong>{verificationResult.certificate.entityData.brandName}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.productName && (
                              <div><span className="text-muted-foreground">Product:</span> <strong>{verificationResult.certificate.entityData.productName}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.classification && (
                              <div><span className="text-muted-foreground">Classification:</span> <strong>{verificationResult.certificate.entityData.classification}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.subClassification && (
                              <div><span className="text-muted-foreground">Sub-Classification:</span> <strong>{verificationResult.certificate.entityData.subClassification}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.expirationDate && (
                              <div><span className="text-muted-foreground">Expiration:</span> <strong>{new Date(verificationResult.certificate.entityData.expirationDate).toLocaleDateString()}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.company && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Company:</span> <strong>{verificationResult.certificate.entityData.company.name}</strong> ({verificationResult.certificate.entityData.company.license})
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {verificationResult.certificate.entityData.address && (
                              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <strong>{verificationResult.certificate.entityData.address}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.licenseNumber && (
                              <div><span className="text-muted-foreground">License:</span> <strong>{verificationResult.certificate.entityData.licenseNumber}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.businessType && (
                              <div><span className="text-muted-foreground">Business Type:</span> <strong>{verificationResult.certificate.entityData.businessType}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.phone && (
                              <div><span className="text-muted-foreground">Phone:</span> <strong>{verificationResult.certificate.entityData.phone}</strong></div>
                            )}
                            {verificationResult.certificate.entityData.email && (
                              <div><span className="text-muted-foreground">Email:</span> <strong>{verificationResult.certificate.entityData.email}</strong></div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Approvers (v2.0+) */}
                  {verificationResult.certificate.approvers && verificationResult.certificate.approvers.length > 0 && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <Shield className="h-4 w-4" />
                        Admin Approvers ({verificationResult.certificate.approvers.length})
                      </h4>
                      <div className="space-y-2">
                        {verificationResult.certificate.approvers.map((approver, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-800 rounded">
                            <div>
                              <span className="font-medium">{approver.name}</span>
                              <div className="text-xs text-muted-foreground">
                                {new Date(approver.date).toLocaleString()}
                              </div>
                            </div>
                            <code className="text-xs bg-muted px-2 py-1 rounded" title={approver.wallet}>
                              {approver.wallet.substring(0, 6)}...{approver.wallet.substring(38)}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <a href={verificationResult.etherscanUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Etherscan
                  </a>
                </Button>
                
                {verificationResult.exists && verificationResult.certificate && (
                  <Button size="sm" onClick={recoverSingleTransaction} disabled={loading.singleRecovery}>
                    {loading.singleRecovery ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Recover This Transaction
                  </Button>
                )}
              </div>

              {singleRecoveryResult && (
                <div className={'p-3 rounded mt-2 ' + getSingleRecoveryResultClass()}>
                  <div className="flex items-center gap-2">
                    {singleRecoveryResult.success && singleRecoveryResult.recoveredEntityId ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : singleRecoveryResult.success ? (
                      <Info className="h-4 w-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">{singleRecoveryResult.message}</span>
                  </div>
                  {singleRecoveryResult.recoveredEntityId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Entity ID: {singleRecoveryResult.recoveredEntityId}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRebuildModal} onOpenChange={setShowRebuildModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5" />
              Rebuild {rebuildRecord?.entityType === 'company' ? 'Company' : 'Product'} from Blockchain
            </DialogTitle>
            <DialogDescription>
              This record was found on the blockchain but is missing from the database. 
              Fill in the required information to rebuild it. Fields from the blockchain are pre-filled and locked.
            </DialogDescription>
          </DialogHeader>

          {rebuildRecord && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Shield className="h-4 w-4" />
                  Blockchain Verified Data (Read-only)
                </h4>
                <p className="text-xs text-muted-foreground">
                  This data was extracted from the immutable blockchain transaction and cannot be modified.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Entity Name</Label>
                    <Input value={rebuildRecord.entityName} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Entity Type</Label>
                    <Input value={rebuildRecord.entityType} disabled className="bg-muted capitalize" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Certificate ID</Label>
                    <Input value={rebuildRecord.certificateId || 'Not available'} disabled className="bg-muted font-mono text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">PDF Hash (SHA-256)</Label>
                    <Input value={rebuildRecord.pdfHash || 'Not available'} disabled className="bg-muted font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Original Registration</Label>
                    <Input value={rebuildRecord.originalTimestamp ? new Date(rebuildRecord.originalTimestamp).toLocaleString() : 'Not available'} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Block Timestamp</Label>
                    <Input value={new Date(rebuildRecord.blockTimestamp).toLocaleString()} disabled className="bg-muted" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Transaction Hash</Label>
                    <div className="flex gap-2">
                      <Input value={rebuildRecord.txHash} disabled className="bg-muted font-mono text-xs flex-1" />
                      <Button variant="outline" size="sm" asChild>
                        <a href={rebuildRecord.etherscanUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Show version badge */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={rebuildRecord.version === '2.0' ? 'default' : 'secondary'}>
                    v{rebuildRecord.version || '1.0'}
                  </Badge>
                  {rebuildRecord.version === '2.0' && (
                    <span className="text-xs text-green-600">Full entity data available</span>
                  )}
                </div>
              </div>

              {/* Show Entity Details from Blockchain (v2.0+) */}
              {rebuildRecord.entityData && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    {rebuildRecord.entityType === 'company' ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    Entity Details from Blockchain
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    These fields are pre-filled from the blockchain and will be used to rebuild the record.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {rebuildRecord.entityType === 'product' ? (
                      <>
                        {rebuildRecord.entityData.LTONumber && (
                          <div><span className="text-muted-foreground">LTO Number:</span> <strong>{rebuildRecord.entityData.LTONumber}</strong></div>
                        )}
                        {rebuildRecord.entityData.CFPRNumber && (
                          <div><span className="text-muted-foreground">CFPR Number:</span> <strong>{rebuildRecord.entityData.CFPRNumber}</strong></div>
                        )}
                        {rebuildRecord.entityData.lotNumber && (
                          <div><span className="text-muted-foreground">Lot Number:</span> <strong>{rebuildRecord.entityData.lotNumber}</strong></div>
                        )}
                        {rebuildRecord.entityData.brandName && (
                          <div><span className="text-muted-foreground">Brand:</span> <strong>{rebuildRecord.entityData.brandName}</strong></div>
                        )}
                        {rebuildRecord.entityData.classification && (
                          <div><span className="text-muted-foreground">Classification:</span> <strong>{rebuildRecord.entityData.classification}</strong></div>
                        )}
                        {rebuildRecord.entityData.subClassification && (
                          <div><span className="text-muted-foreground">Sub-Classification:</span> <strong>{rebuildRecord.entityData.subClassification}</strong></div>
                        )}
                        {rebuildRecord.entityData.expirationDate && (
                          <div><span className="text-muted-foreground">Expiration:</span> <strong>{new Date(rebuildRecord.entityData.expirationDate).toLocaleDateString()}</strong></div>
                        )}
                        {rebuildRecord.entityData.company && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Company:</span> <strong>{rebuildRecord.entityData.company.name}</strong> ({rebuildRecord.entityData.company.license})
                          </div>
                        )}
                        {/* Product Images Section */}
                        <div className="col-span-2 mt-2">
                          <span className="text-muted-foreground text-xs font-medium">Product Images:</span>
                          {rebuildRecord.entityData.productImageFront || rebuildRecord.entityData.productImageBack ? (
                            <div className="flex gap-4 mt-2">
                              {rebuildRecord.entityData.productImageFront && (
                                <div className="text-center">
                                  <img 
                                    src={rebuildRecord.entityData.productImageFront} 
                                    alt="Product Front" 
                                    className="w-24 h-24 object-cover rounded border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                      (e.target as HTMLImageElement).alt = 'Image unavailable';
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">Front</span>
                                </div>
                              )}
                              {rebuildRecord.entityData.productImageBack && (
                                <div className="text-center">
                                  <img 
                                    src={rebuildRecord.entityData.productImageBack} 
                                    alt="Product Back" 
                                    className="w-24 h-24 object-cover rounded border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                      (e.target as HTMLImageElement).alt = 'Image unavailable';
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">Back</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-300">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              No product images stored on blockchain. Images will need to be re-submitted after rebuild.
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {rebuildRecord.entityData.address && (
                          <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <strong>{rebuildRecord.entityData.address}</strong></div>
                        )}
                        {rebuildRecord.entityData.licenseNumber && (
                          <div><span className="text-muted-foreground">License:</span> <strong>{rebuildRecord.entityData.licenseNumber}</strong></div>
                        )}
                        {rebuildRecord.entityData.businessType && (
                          <div><span className="text-muted-foreground">Business Type:</span> <strong>{rebuildRecord.entityData.businessType}</strong></div>
                        )}
                        {rebuildRecord.entityData.phone && (
                          <div><span className="text-muted-foreground">Phone:</span> <strong>{rebuildRecord.entityData.phone}</strong></div>
                        )}
                        {rebuildRecord.entityData.email && (
                          <div><span className="text-muted-foreground">Email:</span> <strong>{rebuildRecord.entityData.email}</strong></div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Show Approvers from Blockchain (v2.0+) */}
              {rebuildRecord.approvers && rebuildRecord.approvers.length > 0 && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Shield className="h-4 w-4" />
                    Admin Approvers ({rebuildRecord.approvers.length})
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    These administrators signed off on this certificate before blockchain registration.
                  </p>
                  <div className="space-y-2">
                    {rebuildRecord.approvers.map((approver, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-800 rounded">
                        <div>
                          <span className="font-medium">{approver.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {new Date(approver.date).toLocaleString()}
                          </div>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded" title={approver.wallet}>
                          {approver.wallet.substring(0, 6)}...{approver.wallet.substring(38)}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-semibold">
                  {rebuildRecord.entityData ? 'Review & Confirm Recovery' : 'Additional Information Required'}
                </h4>
                {rebuildRecord.entityData ? (
                  <div className="text-xs space-y-1">
                    <p className="text-green-600 font-medium">✓ Full blockchain data available - automatic recovery enabled</p>
                    <p className="text-muted-foreground">
                      {rebuildRecord.entityType === 'product' 
                        ? 'The system will auto-create: Company, Brand, and Product Classifications if they don\'t exist.'
                        : 'Fields are pre-filled from blockchain. Modify if needed.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-600">
                    ⚠ This is an older certificate without embedded entity data. Please fill in the required fields manually.
                  </p>
                )}
                
                {rebuildRecord.entityType === 'company' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        placeholder="Enter company address"
                        value={rebuildForm.address}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, address: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseNumber">License Number *</Label>
                      <Input
                        id="licenseNumber"
                        placeholder="Enter license number"
                        value={rebuildForm.licenseNumber}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessType">Business Type</Label>
                      <Input
                        id="businessType"
                        placeholder="e.g., Manufacturer, Distributor"
                        value={rebuildForm.businessType}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, businessType: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="Contact phone number"
                        value={rebuildForm.phone}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Contact email"
                        value={rebuildForm.email}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://..."
                        value={rebuildForm.website}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, website: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Company description..."
                        value={rebuildForm.description}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="LTONumber">LTO Number *</Label>
                      <Input
                        id="LTONumber"
                        placeholder="Enter LTO Number"
                        value={rebuildForm.LTONumber}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, LTONumber: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="CFPRNumber">CFPR Number *</Label>
                      <Input
                        id="CFPRNumber"
                        placeholder="Enter CFPR Number"
                        value={rebuildForm.CFPRNumber}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, CFPRNumber: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lotNumber">Lot Number *</Label>
                      <Input
                        id="lotNumber"
                        placeholder="Enter Lot Number"
                        value={rebuildForm.lotNumber}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, lotNumber: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expirationDate">Expiration Date *</Label>
                      <Input
                        id="expirationDate"
                        type="date"
                        value={rebuildForm.expirationDate}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, expirationDate: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productClassification">Classification *</Label>
                      <Input
                        id="productClassification"
                        placeholder="Product classification"
                        value={rebuildForm.productClassification}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, productClassification: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productSubClassification">Sub-Classification *</Label>
                      <Input
                        id="productSubClassification"
                        placeholder="Product sub-classification"
                        value={rebuildForm.productSubClassification}
                        onChange={(e) => setRebuildForm(prev => ({ ...prev, productSubClassification: e.target.value }))}
                        disabled={!!rebuildRecord.entityData}
                        className={rebuildRecord.entityData ? 'bg-muted' : ''}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="companyId">
                        Company {rebuildRecord.entityData?.company ? '(Auto-create from blockchain)' : '*'}
                      </Label>
                      <Select 
                        value={rebuildForm.companyId || '__auto_create__'} 
                        onValueChange={(value) => setRebuildForm(prev => ({ ...prev, companyId: value === '__auto_create__' ? '' : value }))}
                        disabled={!!rebuildRecord.entityData?.company}
                      >
                        <SelectTrigger className={rebuildRecord.entityData?.company ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                        <SelectContent>
                          {rebuildRecord.entityData?.company && (
                            <SelectItem value="__auto_create__">
                              🔄 Auto-create: {rebuildRecord.entityData.company.name}
                            </SelectItem>
                          )}
                          {companies.map(company => (
                            <SelectItem key={company._id} value={company._id}>
                              {company.name} ({company.licenseNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rebuildRecord.entityData?.company ? (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Company &quot;{rebuildRecord.entityData.company.name}&quot; will be auto-created if it doesn&apos;t exist.
                          Brand &quot;{rebuildRecord.entityData.brandName}&quot; and classifications will also be auto-created.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          If the company does not exist, rebuild it first from the blockchain.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRebuildModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRebuildSubmit} disabled={loading.rebuild}>
              {loading.rebuild ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <Hammer className="h-4 w-4 mr-2" />
                  Rebuild Record
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BlockchainRecovery;
