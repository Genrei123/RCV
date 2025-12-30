import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Upload, CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink, Link as LinkIcon } from "lucide-react";
import { CertificateBlockchainService } from "@/services/certificateBlockchainService";
import { MetaMaskService } from "@/services/metaMaskService";
import { toast } from "react-toastify";

export function CertificateVerifier() {
  const [certificateId, setCertificateId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Sepolia transaction verification
  const [txHash, setTxHash] = useState("");
  const [sepoliaVerifying, setSepoliaVerifying] = useState(false);
  const [sepoliaResult, setSepoliaResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setPdfFile(file);
      setVerificationResult(null);
    }
  };

  const handleVerify = async () => {
    if (!certificateId.trim()) {
      toast.error('Please enter a Certificate ID');
      return;
    }

    if (!pdfFile) {
      toast.error('Please select a PDF file');
      return;
    }

    setVerifying(true);
    setVerificationResult(null);

    try {
      // Calculate PDF hash
      toast.info('Calculating PDF hash...', { autoClose: 1000 });
      const pdfHash = await CertificateBlockchainService.calculatePDFHash(pdfFile);

      // Verify against blockchain
      toast.info('Verifying against blockchain...', { autoClose: 1000 });
      const result = await CertificateBlockchainService.verifyCertificate(certificateId, pdfHash);

      setVerificationResult(result);

      if (result.success && result.verification?.isValid) {
        toast.success('✅ Certificate is authentic!');
      } else {
        toast.error('Certificate verification failed!');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please try again.');
      setVerificationResult({
        success: false,
        error: error.message || 'Unknown error'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setCertificateId("");
    setPdfFile(null);
    setVerificationResult(null);
  };

  // Verify Sepolia transaction
  const handleSepoliaVerify = async () => {
    if (!txHash.trim()) {
      toast.error("Please enter a transaction hash");
      return;
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) {
      toast.error("Invalid transaction hash format");
      return;
    }

    setSepoliaVerifying(true);
    setSepoliaResult(null);

    try {
      const result = await MetaMaskService.verifyTransaction(txHash.trim());
      setSepoliaResult(result);

      if (result.success && result.data?.isValid) {
        toast.success("✅ Transaction verified on Sepolia!");
      } else {
        toast.error("Transaction verification failed");
      }
    } catch (error: any) {
      console.error("Sepolia verification error:", error);
      setSepoliaResult({
        success: false,
        error: error.message || "Verification failed"
      });
      toast.error("Failed to verify on Sepolia");
    } finally {
      setSepoliaVerifying(false);
    }
  };

  const handleSepoliaReset = () => {
    setTxHash("");
    setSepoliaResult(null);
  };

  return (
    <PageContainer
      title="Certificate Verifier"
      description="Verify the authenticity of PDF certificates using blockchain"
    >
      <div className="max-w-4xl mx-auto">

        {/* Verification Form */}
        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Certificate ID Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Certificate ID
                  <span className="text-error-500 ml-1">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., CERT-COMP-abc123-1730809200000"
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  className="font-mono text-sm"
                  disabled={verifying}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Scan the QR code on the certificate to get the Certificate ID
                </p>
              </div>

              {/* PDF Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  PDF Certificate File
                  <span className="text-error-500 ml-1">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1">
                    <div className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors
                      ${pdfFile 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-neutral-300 hover:border-teal-500 hover:bg-neutral-50'
                      }
                      ${verifying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                      {pdfFile ? (
                        <div>
                          <p className="text-sm font-medium text-teal-700">{pdfFile.name}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {(pdfFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-600">Click to select PDF file</p>
                          <p className="text-xs text-neutral-500 mt-1">or drag and drop</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={verifying}
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleVerify}
                  disabled={!certificateId.trim() || !pdfFile || verifying}
                  className="flex-1"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Certificate
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={verifying}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Result */}
        {verificationResult && (
          <Card className="mt-6">
            <CardContent className="p-6">
              {verificationResult.success && verificationResult.verification?.isValid ? (
                // SUCCESS - Certificate is Authentic
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 text-lg">
                        ✅ Certificate is Authentic
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        This certificate has been verified against the blockchain and has not been tampered with.
                      </p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-600 mb-1">Certificate ID</p>
                      <p className="font-mono text-sm text-neutral-900 break-all">
                        {verificationResult.verification.certificateId}
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-600 mb-1">Block Index</p>
                      <p className="font-semibold text-neutral-900">
                        #{verificationResult.verification.blockIndex}
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-600 mb-1">Certificate Type</p>
                      <p className="font-semibold text-neutral-900 capitalize">
                        {verificationResult.verification.certificateType}
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-600 mb-1">Entity Name</p>
                      <p className="font-semibold text-neutral-900">
                        {verificationResult.verification.entityName}
                      </p>
                    </div>
                    {verificationResult.verification.issuedDate && (
                      <div className="p-3 bg-neutral-50 rounded-lg col-span-2">
                        <p className="text-xs text-neutral-600 mb-1">Issue Date</p>
                        <p className="font-semibold text-neutral-900">
                          {new Date(verificationResult.verification.issuedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Verification Checks */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-neutral-900 text-sm">Verification Checks:</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-neutral-700">PDF hash matches blockchain record</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-neutral-700">Blockchain block integrity verified</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-neutral-700">Certificate exists in blockchain</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // FAILURE - Certificate is Invalid or Tampered
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <XCircle className="h-8 w-8 text-error-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-error-900 text-lg">
                        ❌ Certificate Verification Failed
                      </h3>
                      <p className="text-sm text-error-700 mt-1">
                        {verificationResult.verification?.message || verificationResult.error || 
                         'This certificate could not be verified or has been tampered with.'}
                      </p>
                    </div>
                  </div>

                  {verificationResult.verification && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-neutral-900 text-sm">Verification Issues:</h4>
                      <div className="space-y-1">
                        {!verificationResult.verification.pdfHashMatch && (
                          <div className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-error-600" />
                            <span className="text-neutral-700">
                              <strong>PDF has been modified</strong> - Hash does not match blockchain record
                            </span>
                          </div>
                        )}
                        {!verificationResult.verification.blockIntegrity && (
                          <div className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-error-600" />
                            <span className="text-neutral-700">
                              <strong>Blockchain block corrupted</strong> - Block integrity check failed
                            </span>
                          </div>
                        )}
                        {!verificationResult.verification.blockIndex && (
                          <div className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-error-600" />
                            <span className="text-neutral-700">
                              <strong>Certificate not found</strong> - No blockchain record exists
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This certificate may be fraudulent. Do not accept it as valid.
                        Contact the issuing authority if you believe this is an error.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-neutral-500">Or verify using</span>
          </div>
        </div>

        {/* Sepolia Blockchain Verification */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <LinkIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Sepolia Blockchain Verification</h3>
                <p className="text-sm text-neutral-500">Verify using Ethereum Sepolia testnet transaction hash</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Transaction Hash Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Transaction Hash
                  <span className="text-error-500 ml-1">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="font-mono text-sm"
                  disabled={sepoliaVerifying}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Enter the transaction hash from the certificate or scan the QR code
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSepoliaVerify}
                  disabled={!txHash.trim() || sepoliaVerifying}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {sepoliaVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying on Sepolia...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify on Sepolia
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSepoliaReset}
                  disabled={sepoliaVerifying}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sepolia Verification Result */}
        {sepoliaResult && (
          <Card className="mt-6">
            <CardContent className="p-6">
              {sepoliaResult.success && sepoliaResult.data?.isValid ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-purple-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 text-lg">
                        ✅ Transaction Verified on Sepolia
                      </h3>
                      <p className="text-sm text-purple-700 mt-1">
                        This transaction has been verified on the Ethereum Sepolia testnet.
                      </p>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-600 mb-1">Block Number</p>
                      <p className="font-semibold text-neutral-900">
                        #{sepoliaResult.data.blockNumber}
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-600 mb-1">Timestamp</p>
                      <p className="font-semibold text-neutral-900">
                        {new Date(sepoliaResult.data.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {sepoliaResult.data.data && (
                      <>
                        <div className="p-3 bg-neutral-50 rounded-lg">
                          <p className="text-xs text-neutral-600 mb-1">Certificate Type</p>
                          <p className="font-semibold text-neutral-900 capitalize">
                            {sepoliaResult.data.data.entityType || "N/A"}
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg">
                          <p className="text-xs text-neutral-600 mb-1">Entity Name</p>
                          <p className="font-semibold text-neutral-900">
                            {sepoliaResult.data.data.entityName || "N/A"}
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg col-span-2">
                          <p className="text-xs text-neutral-600 mb-1">Certificate ID</p>
                          <p className="font-mono text-sm text-neutral-900 break-all">
                            {sepoliaResult.data.data.certificateId || "N/A"}
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg col-span-2">
                          <p className="text-xs text-neutral-600 mb-1">PDF Hash</p>
                          <p className="font-mono text-xs text-neutral-900 break-all">
                            {sepoliaResult.data.data.pdfHash || "N/A"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Etherscan Link */}
                  <div className="flex justify-center">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Etherscan
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <XCircle className="h-8 w-8 text-error-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-error-900 text-lg">
                        ❌ Transaction Verification Failed
                      </h3>
                      <p className="text-sm text-error-700 mt-1">
                        {sepoliaResult.error || "Could not verify this transaction on Sepolia."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
