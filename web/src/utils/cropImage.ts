// Utility to crop an image to a square (circle mask optional) using a canvas
// Based on react-easy-crop croppedAreaPixels
export async function getCroppedImg(
  imageSrc: string,
  croppedAreaPixels: { x: number; y: number; width: number; height: number },
  outputSize = 256,
  asCircle = true
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");

  canvas.width = outputSize;
  canvas.height = outputSize;

  // Draw to an offscreen canvas first to extract crop
  const offCanvas = document.createElement("canvas");
  offCanvas.width = croppedAreaPixels.width;
  offCanvas.height = croppedAreaPixels.height;
  const offCtx = offCanvas.getContext("2d");
  if (!offCtx) throw new Error("2D context not available");

  offCtx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  if (asCircle) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  // Draw the cropped content scaled to output size
  ctx.drawImage(offCanvas, 0, 0, outputSize, outputSize);

  if (asCircle) {
    ctx.restore();
  }

  // Export as PNG data URL
  return canvas.toDataURL("image/png");
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    img.setAttribute("crossorigin", "anonymous"); // to avoid CORS issues on export
    img.src = url;
  });
}
