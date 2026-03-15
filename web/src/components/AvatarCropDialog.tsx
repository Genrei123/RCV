import { useCallback, useState, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedImg } from "@/utils/cropImage";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
  isUploading?: boolean;
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onCancel,
  onSave,
  isUploading = false,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset saving state when upload completes
  useEffect(() => {
    if (!isUploading && saving) {
      setSaving(false);
    }
  }, [isUploading, saving]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels || isUploading) return;
    setSaving(true);
    try {
      const dataUrl = await getCroppedImg(
        imageSrc,
        {
          x: Math.round(croppedAreaPixels.x),
          y: Math.round(croppedAreaPixels.y),
          width: Math.round(croppedAreaPixels.width),
          height: Math.round(croppedAreaPixels.height),
        },
        256,
        true
      );
      onSave(dataUrl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Avatar crop save error", e);
      setSaving(false); // Only reset saving state on error
    }
    // Note: Don't reset saving state on success - let parent component control this via isUploading
  }, [croppedAreaPixels, imageSrc, onSave, isUploading]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-80 bg-gray-900 rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition={true}
          />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={saving || isUploading}>
            Cancel
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSave}
            disabled={saving || isUploading}
          >
            {isUploading ? "Saving..." : saving ? "Processing..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
