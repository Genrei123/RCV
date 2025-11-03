declare module "react-easy-crop" {
  import * as React from "react";
  export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  export interface CropperProps {
    image: string;
    crop: { x: number; y: number };
    zoom: number;
    aspect?: number;
    cropShape?: "rect" | "round";
    showGrid?: boolean;
    restrictPosition?: boolean;
    onCropChange: (crop: { x: number; y: number }) => void;
    onZoomChange?: (zoom: number) => void;
    onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
  }
  const Cropper: React.FC<CropperProps>;
  export default Cropper;
  export { Area };
}
