import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mail, 
  BadgeCheck, 
  Loader2, 
  Send,
  UserPlus,
  Monitor,
  Smartphone
} from "lucide-react";
import { AdminInviteService } from "@/services/adminInviteService";
import { toast } from "react-toastify";

interface AddAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAgentModal({ open, onOpenChange, onSuccess }: AddAgentModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    badgeId: "",
    personalMessage: "",
    webAccess: false,
    appAccess: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.badgeId.trim()) {
      newErrors.badgeId = "Badge ID is required";
    }

    if (!formData.webAccess && !formData.appAccess) {
      newErrors.access = "At least one access type must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await AdminInviteService.createInvite({
        email: formData.email.trim(),
        badgeId: formData.badgeId.trim(),
        personalMessage: formData.personalMessage.trim() || undefined,
        webAccess: formData.webAccess,
        appAccess: formData.appAccess,
      });

      if (response.success) {
        toast.success(`Invitation sent to ${formData.email}`);
        // Reset form
        setFormData({ email: "", badgeId: "", personalMessage: "", webAccess: false, appAccess: true });
        setErrors({});
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.message || "Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Error creating invite:", error);
      const errorMessage = error.response?.data?.message || "Failed to send invitation";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ email: "", badgeId: "", personalMessage: "", webAccess: false, appAccess: true });
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-600" />
            Invite New Agent
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a potential agent. They will receive an email with 
            a registration link and must verify their badge number to complete registration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="agent@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              disabled={loading}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Badge ID Field */}
          <div className="space-y-2">
            <Label htmlFor="badgeId" className="flex items-center gap-1">
              <BadgeCheck className="w-4 h-4" />
              Badge ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="badgeId"
              type="text"
              placeholder="e.g., AGT-2024-001"
              value={formData.badgeId}
              onChange={(e) => {
                setFormData({ ...formData, badgeId: e.target.value.toUpperCase() });
                if (errors.badgeId) setErrors({ ...errors, badgeId: "" });
              }}
              disabled={loading}
              className={errors.badgeId ? "border-red-500" : ""}
            />
            {errors.badgeId && (
              <p className="text-sm text-red-500">{errors.badgeId}</p>
            )}
            <p className="text-xs text-gray-500">
              The agent must enter this exact badge ID to verify their identity during registration.
            </p>
          </div>

          {/* Personal Message Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="personalMessage" className="flex items-center gap-1">
              Personal Message <span className="text-gray-400">(Optional)</span>
            </Label>
            <Textarea
              id="personalMessage"
              placeholder="Add a personal welcome message for the agent..."
              value={formData.personalMessage}
              onChange={(e) => setFormData({ ...formData, personalMessage: e.target.value })}
              disabled={loading}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This message will be included in the invitation email.
            </p>
          </div>

          {/* Access Permissions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Access Permissions <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="appAccess"
                  checked={formData.appAccess}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, appAccess: checked as boolean });
                    if (errors.access) setErrors({ ...errors, access: "" });
                  }}
                  disabled={loading}
                />
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <Label htmlFor="appAccess" className="text-sm font-normal cursor-pointer">
                    Mobile App Access
                  </Label>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="webAccess"
                  checked={formData.webAccess}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, webAccess: checked as boolean });
                    if (errors.access) setErrors({ ...errors, access: "" });
                  }}
                  disabled={loading}
                />
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-green-600" />
                  <Label htmlFor="webAccess" className="text-sm font-normal cursor-pointer">
                    Web Dashboard Access
                  </Label>
                </div>
              </div>
            </div>
            {errors.access && (
              <p className="text-sm text-red-500">{errors.access}</p>
            )}
            <p className="text-xs text-gray-500">
              Select which platforms this agent will have access to. You can change this later.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-800">
              <strong>Note:</strong> After the agent completes registration, their account 
              will be pending your approval. They will need to upload:
            </p>
            <ul className="mt-2 ml-4 list-disc text-blue-700">
              <li>A valid ID document</li>
              <li>A selfie holding the ID document</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
