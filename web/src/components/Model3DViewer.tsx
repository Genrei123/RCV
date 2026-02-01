import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as LucideIcons from "lucide-react";
import { X } from "lucide-react";

interface Hotspot3D {
  title: string;
  description: string;
  xPosition: number;
  yPosition: number;
  zPosition: number;
  icon?: string;
}

interface Model3DViewerProps {
  modelUrl: string;
  hotspots: Hotspot3D[];
}

function Model({ url, onLoad }: { url: string; onLoad?: () => void }) {
  const gltf = useGLTF(url);
  
  // Call onLoad when model is ready
  if (onLoad) {
    setTimeout(onLoad, 100);
  }
  
  return (
    <primitive 
      object={gltf.scene} 
      scale={1}
      position={[0, 1.5, 0]}
    />
  );
}

function Hotspot3DMarker({ 
  position, 
  hotspot, 
  onClick, 
  isActive 
}: { 
  position: [number, number, number]; 
  hotspot: Hotspot3D; 
  onClick: () => void;
  isActive: boolean;
}) {
  const getIcon = (iconName?: string) => {
    if (!iconName) return LucideIcons.MapPin;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.MapPin;
  };

  const Icon = getIcon(hotspot.icon);

  return (
    <Html position={position} style={{ pointerEvents: 'all' }}>
      <div className="relative">
        <button
          onClick={onClick}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full app-bg-primary text-white shadow-lg transition-all duration-300 hover:scale-110 ${
            isActive ? 'scale-110 ring-4 ring-primary/30' : ''
          }`}
        >
          {!isActive && (
            <span className="absolute inset-0 rounded-full app-bg-primary opacity-75 animate-ping"></span>
          )}
          <Icon className="w-5 h-5 relative z-10" />
        </button>
        
        {isActive && (
          <div className="absolute z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 left-12 top-0 transform -translate-y-1/2">
            <button
              onClick={onClick}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 app-bg-primary-soft rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text mb-1">
                  {hotspot.title}
                </h4>
                <p className="text-sm text-text-subtle">
                  {hotspot.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

export function Model3DViewer({ modelUrl, hotspots }: Model3DViewerProps) {
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-xl relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading 3D Model...</p>
          </div>
        </div>
      )}

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 8, 0]} fov={50} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
          target={[0, 1.5, 0]}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        
        {/* 3D Model */}
        <Suspense fallback={null}>
          <Model url={modelUrl} onLoad={() => setIsLoading(false)} />
          
          {/* 3D Hotspots */}
          {hotspots.map((hotspot, index) => (
            <Hotspot3DMarker
              key={index}
              position={[hotspot.xPosition, hotspot.yPosition, hotspot.zPosition]}
              hotspot={hotspot}
              onClick={() => setActiveHotspot(activeHotspot === index ? null : index)}
              isActive={activeHotspot === index}
            />
          ))}
        </Suspense>
        
        {/* Grid Helper */}
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  );
}
