import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Upload,
  UserPlus,
  Globe,
  Smartphone,
  Monitor,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Link2,
} from "lucide-react";
import { toast } from "react-toastify";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import * as XLSX from "xlsx";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyOwnerId: string;
  companyName: string;
  onSuccess: () => void;
}

interface BulkResult {
  email: string;
  success: boolean;
  error?: string;
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  companyOwnerId,
  companyName,
  onSuccess,
}: AddEmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "link">("single");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single invite state
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  // Permissions state
  const [hasWebAccess, setHasWebAccess] = useState(false);
  const [hasAppAccess, setHasAppAccess] = useState(true);
  const [hasKioskAccess, setHasKioskAccess] = useState(false);

  // Bulk invite state
  const [bulkEmails, setBulkEmails] = useState<{ email: string }[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [fileName, setFileName] = useState("");

  // Link generation state
  const [generatedLink, setGeneratedLink] = useState("");

  const resetForm = () => {
    setEmployeeEmail("");
    setPersonalMessage("");
    setHasWebAccess(false);
    setHasAppAccess(true);
    setHasKioskAccess(false);
    setBulkEmails([]);
    setBulkResults(null);
    setFileName("");
    setGeneratedLink("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSingleInvite = async () => {
    if (!employeeEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!validateEmail(employeeEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await CompanyOwnerService.generateInviteLink(companyOwnerId, {
        employeeEmail: employeeEmail.trim().toLowerCase(),
        personalMessage: personalMessage.trim() || undefined,
        hasWebAccess,
        hasAppAccess,
        hasKioskAccess,
        sendEmail: true,
      });

      toast.success(`Invite sent to ${employeeEmail}`);
      resetForm();
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setFileName(file.name);
    setBulkResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Look for email column (case-insensitive)
        const emails: { email: string }[] = [];
        jsonData.forEach((row: any) => {
          const emailKey = Object.keys(row).find(
            (key) => key.toLowerCase() === "email"
          );
          if (emailKey && row[emailKey]) {
            const email = String(row[emailKey]).trim().toLowerCase();
            if (email && validateEmail(email)) {
              emails.push({ email });
            }
          }
        });

        if (emails.length === 0) {
          toast.error('No valid emails found. Make sure your file has an "Email" column.');
          return;
        }

        // Remove duplicates
        const uniqueEmails = Array.from(
          new Map(emails.map((e) => [e.email, e])).values()
        );

        setBulkEmails(uniqueEmails);
        toast.success(`Found ${uniqueEmails.length} valid email addresses`);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkInvite = async () => {
    if (bulkEmails.length === 0) {
      toast.error("Please upload a file with email addresses first");
      return;
    }

    setLoading(true);
    try {
      const result = await CompanyOwnerService.bulkInviteEmployees(
        companyOwnerId,
        bulkEmails,
        {
          personalMessage: personalMessage.trim() || undefined,
          hasWebAccess,
          hasAppAccess,
          hasKioskAccess,
        }
      );

      setBulkResults(result.results);
      
      if (result.summary.success > 0) {
        toast.success(`Successfully sent ${result.summary.success} invites`);
        onSuccess();
      }
      if (result.summary.failed > 0) {
        toast.warning(`${result.summary.failed} invites failed`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send bulk invites");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const result = await CompanyOwnerService.generateInviteLink(companyOwnerId, {
        hasWebAccess,
        hasAppAccess,
        hasKioskAccess,
        sendEmail: false,
      });

      setGeneratedLink(result.inviteLink);
      toast.success("Invite link generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-6 w-6 text-purple-600" />
            Add Employee to {companyName}
          </DialogTitle>
          <DialogDescription>
            Invite employees to join your company on the RCV platform
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Single Invite
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Generate Link
            </TabsTrigger>
          </TabsList>

          {/* Permissions Section - Common for all tabs */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-3">
              Set Permissions for New Employee(s)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="webAccess"
                  checked={hasWebAccess}
                  onCheckedChange={(checked) => setHasWebAccess(!!checked)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="webAccess"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="h-4 w-4 text-blue-600" />
                    Web Access
                  </Label>
                  <p className="text-xs text-gray-500">Dashboard & team management</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="appAccess"
                  checked={hasAppAccess}
                  onCheckedChange={(checked) => setHasAppAccess(!!checked)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="appAccess"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 text-green-600" />
                    App Access
                  </Label>
                  <p className="text-xs text-gray-500">Mobile app reporting</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="kioskAccess"
                  checked={hasKioskAccess}
                  onCheckedChange={(checked) => setHasKioskAccess(!!checked)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="kioskAccess"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Monitor className="h-4 w-4 text-purple-600" />
                    Kiosk Access
                  </Label>
                  <p className="text-xs text-gray-500">Kiosk technician access</p>
                </div>
              </div>
            </div>
          </div>

          {/* Single Invite Tab */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Employee Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@example.com"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal welcome message for the employee..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                This message will appear in the invitation email
              </p>
            </div>

            <Button
              onClick={handleSingleInvite}
              disabled={loading || !employeeEmail.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation Email
                </>
              )}
            </Button>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Upload Excel or CSV File</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Excel (.xlsx, .xls) or CSV files with an "Email" column
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <FileSpreadsheet className="h-4 w-4" />
                  {fileName}
                  <span className="text-purple-600 font-medium ml-auto">
                    {bulkEmails.length} emails found
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkMessage">Personal Message (Optional)</Label>
              <Textarea
                id="bulkMessage"
                placeholder="Add a personal welcome message for all employees..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
              />
            </div>

            {bulkResults && (
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Results:</p>
                {bulkResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-sm p-1 rounded ${
                      result.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{result.email}</span>
                    {result.error && (
                      <span className="text-red-600 text-xs ml-auto">
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleBulkInvite}
              disabled={loading || bulkEmails.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invites...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send {bulkEmails.length} Invitations
                </>
              )}
            </Button>
          </TabsContent>

          {/* Generate Link Tab */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p>
                Generate a generic invite link that anyone can use to register.
                Share this link manually via your preferred method.
              </p>
            </div>

            {generatedLink ? (
              <div className="space-y-3">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="bg-gray-50 text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  This link expires in 7 days
                </p>
                <Button
                  variant="outline"
                  onClick={() => setGeneratedLink("")}
                  className="w-full"
                >
                  Generate New Link
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
