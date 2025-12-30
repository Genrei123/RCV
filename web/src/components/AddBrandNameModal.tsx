import { useState } from "react";
import { X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandNameService } from "@/services/brandNameService";
import { toast } from "react-toastify";

interface AddBrandNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBrandNameModal({
  isOpen,
  onClose,
  onSuccess,
}: AddBrandNameModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      newErrors.name = "Brand name is required";
    } else if (formData.name.trim().length < 1) {
      newErrors.name = "Brand name must be at least 1 character";
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
      const response = await BrandNameService.createBrandName({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      toast.success(response.message || "Brand name created successfully!");

      // Reset form
      setFormData({ name: "", description: "" });
      setErrors({});

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating brand name:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create brand name. Please try again.";
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
              <Tag className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">Add Brand Name</h2>
              <p className="text-sm app-text-subtle">
                Create a new brand name for products
              </p>
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
            <div>
              <label className="block text-sm font-medium app-text-subtle mb-2">
                Brand Name *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter brand name"
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
                placeholder="Optional description for this brand"
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
                    <Tag className="w-4 h-4 mr-2" />
                    Create Brand Name
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
