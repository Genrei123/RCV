import { useState, useEffect } from "react";
import { X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductClassificationService } from "@/services/productClassificationService";
import type { ProductClassification } from "@/typeorm/entities/productClassification.entity";
import { toast } from "react-toastify";

interface AddClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentClassification?: ProductClassification | null; // If set, creating a sub-classification
}

export function AddClassificationModal({
  isOpen,
  onClose,
  onSuccess,
  parentClassification,
}: AddClassificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or parent changes
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: "", description: "" });
      setErrors({});
    }
  }, [isOpen, parentClassification]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = `${parentClassification ? "Sub-classification" : "Classification"} name is required`;
    } else if (formData.name.trim().length < 1) {
      newErrors.name = "Name must be at least 1 character";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in the required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await ProductClassificationService.createClassification({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parentId: parentClassification?._id,
      });

      toast.success(response.message || `${parentClassification ? "Sub-classification" : "Classification"} created successfully!`);

      // Reset form
      setFormData({ name: "", description: "" });
      setErrors({});

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating classification:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create classification. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: "", description: "" });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  const isSubClassification = !!parentClassification;
  const title = isSubClassification
    ? "Add Sub-Classification"
    : "Add Product Classification";
  const subtitle = isSubClassification
    ? `Under: ${parentClassification.name}`
    : "Create a new product classification";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 app-bg-primary-soft rounded-lg">
              <Layers className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">{title}</h2>
              <p className="text-sm app-text-subtle">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSubClassification && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  Creating sub-classification under:{" "}
                  <span className="font-semibold">{parentClassification.name}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium app-text-subtle mb-2">
                {isSubClassification ? "Sub-Classification" : "Classification"} Name *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={`Enter ${isSubClassification ? "sub-" : ""}classification name`}
                className={errors.name ? "border-[color:var(--app-error)]" : ""}
                disabled={loading}
              />
              {errors.name && (
                <p className="app-text-error text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium app-text-subtle mb-2">
                Description
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description"
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
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
                className="app-bg-primary text-white hover:opacity-90 cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <Layers className="w-4 h-4 mr-2" />
                    Create {isSubClassification ? "Sub-Classification" : "Classification"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
