import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Upload, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { CertificateBlockchainService } from "@/services/certificateBlockchainService";
import { toast } from "react-toastify";

export function CertificateVerifier() {
  const [certificateId, setCertificateId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate ID
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., CERT-COMP-abc123-1730809200000"
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  className="font-mono text-sm"
                  disabled={verifying}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Scan the QR code on the certificate to get the Certificate ID
                </p>
              </div>

              {/* PDF Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF Certificate File
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1">
                    <div className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors
                      ${pdfFile 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-gray-300 hover:border-teal-500 hover:bg-gray-50'
                      }
                      ${verifying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      {pdfFile ? (
                        <div>
                          <p className="text-sm font-medium text-teal-700">{pdfFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(pdfFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600">Click to select PDF file</p>
                          <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
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
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Certificate ID</p>
                      <p className="font-mono text-sm text-gray-900 break-all">
                        {verificationResult.verification.certificateId}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Block Index</p>
                      <p className="font-semibold text-gray-900">
                        #{verificationResult.verification.blockIndex}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Certificate Type</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {verificationResult.verification.certificateType}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Entity Name</p>
                      <p className="font-semibold text-gray-900">
                        {verificationResult.verification.entityName}
                      </p>
                    </div>
                    {verificationResult.verification.issuedDate && (
                      <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                        <p className="text-xs text-gray-600 mb-1">Issue Date</p>
                        <p className="font-semibold text-gray-900">
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
                    <h4 className="font-semibold text-gray-900 text-sm">Verification Checks:</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">PDF hash matches blockchain record</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">Blockchain block integrity verified</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">Certificate exists in blockchain</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // FAILURE - Certificate is Invalid or Tampered
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 text-lg">
                        ❌ Certificate Verification Failed
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        {verificationResult.verification?.message || verificationResult.error || 
                         'This certificate could not be verified or has been tampered with.'}
                      </p>
                    </div>
                  </div>

                  {verificationResult.verification && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 text-sm">Verification Issues:</h4>
                      <div className="space-y-1">
                        {!verificationResult.verification.pdfHashMatch && (
                          <div className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-gray-700">
                              <strong>PDF has been modified</strong> - Hash does not match blockchain record
                            </span>
                          </div>
                        )}
                        {!verificationResult.verification.blockIntegrity && (
                          <div className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-gray-700">
                              <strong>Blockchain block corrupted</strong> - Block integrity check failed
                            </span>
                          </div>
                        )}
                        {!verificationResult.verification.blockIndex && (
                          <div className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-gray-700">
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
      </div>
    </PageContainer>
  );
}
