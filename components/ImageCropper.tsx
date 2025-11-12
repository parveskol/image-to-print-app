import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import { PASSPORT_SIZES, DPI } from "../constants";
import { PassportSize, SheetMode } from "../types";
import {
  BackIcon,
  CropIcon,
  DownloadIcon,
  MagicWandIcon,
  PlusIcon,
} from "./icons";
// [FIX 1] Import the correct background removal function
import { removeBackground } from "../utils/backgroundRemoval";

interface ImageCropperProps {
  imageSrc: string;
  onProcess: (
    dataUrl: string,
    size: PassportSize,
    pixelDimensions?: { width: number; height: number },
    finalAction?: "print" | "upload",
  ) => void;
  onBack: () => void;
  queuePosition?: number;
  queueLength?: number;
  sheetMode: SheetMode | null;
}

const JPEG_QUALITY = 0.95; // Standardize JPEG quality for accuracy

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

type BorderPosition = "inner" | "outer";

const drawOnCanvas = async (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  image: HTMLImageElement,
  cropData: Crop,
  photoSize: PassportSize,
  options: {
    borderWidth_mm: number;
    borderColor: string;
    borderPosition: BorderPosition;
    addStroke: boolean;
  },
  renderConfig: { isPreview: boolean; dpi?: number },
): Promise<Blob | null> => {
  const ctx = canvas.getContext("2d");

  // [FIX 5] Type guard moved to the top to ensure ctx is valid before any operation
  if (
    !(
      ctx instanceof CanvasRenderingContext2D ||
      ctx instanceof OffscreenCanvasRenderingContext2D
    )
  ) {
    console.error("Canvas context is not a 2D rendering context.");
    canvas.width = 1;
    canvas.height = 1;
    return null;
  }

  if (!cropData.width || !cropData.height || photoSize.width_mm <= 0) {
    canvas.width = 1;
    canvas.height = 1;
    ctx.clearRect(0, 0, 1, 1);
    return null;
  }

  const { borderWidth_mm, borderColor, borderPosition, addStroke } = options;
  const { isPreview, dpi } = renderConfig;

  let finalW: number, finalH: number, pxPerMm: number;

  // Calculate dimensions based on preview or final output
  if (isPreview) {
    const PREVIEW_WIDTH = 200;
    const aspect = photoSize.width_mm / photoSize.height_mm;
    finalW = PREVIEW_WIDTH;
    finalH = PREVIEW_WIDTH / aspect;
    pxPerMm = finalW / photoSize.width_mm;
  } else {
    const renderDpi = dpi || DPI;
    pxPerMm = renderDpi / 25.4;
    finalW = Math.round(photoSize.width_mm * pxPerMm);
    finalH = Math.round(photoSize.height_mm * pxPerMm);
  }

  // Memory optimization: reduce quality for low-end devices
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // Reduce canvas size for low-memory devices
  if (deviceMemory < 4 || hardwareConcurrency < 4) {
    const scaleFactor = Math.min(deviceMemory / 4, hardwareConcurrency / 4, 1);
    finalW = Math.round(finalW * scaleFactor);
    finalH = Math.round(finalH * scaleFactor);
    pxPerMm *= scaleFactor;
  }

  const borderW_px =
    borderWidth_mm > 0 ? Math.max(1, Math.round(borderWidth_mm * pxPerMm)) : 0;
  const strokeWidth_px = addStroke ? Math.max(1, Math.round(0.1 * pxPerMm)) : 0;

  canvas.width = finalW;
  canvas.height = finalH;

  // Optimize canvas settings for mobile
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = deviceMemory < 4 ? "low" : "high";
  ctx.clearRect(0, 0, finalW, finalH);

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const cropX = cropData.x * scaleX;
  const cropY = cropData.y * scaleY;
  const cropWidth = cropData.width * scaleX;
  const cropHeight = cropData.height * scaleY;

  // Check if the canvas dimensions are valid before drawing
  if (finalW <= 0 || finalH <= 0 || cropWidth <= 0 || cropHeight <= 0) {
    console.warn("Invalid canvas or crop dimensions, skipping draw operation.");
    return null;
  }

  // --- Start Drawing ---

  // 1. Fill background for outer border or transparent images
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, finalW, finalH);

  // 2. Draw the cropped photo
  const imgDestX =
    borderPosition === "outer" && borderW_px > 0 ? borderW_px : 0;
  const imgDestY =
    borderPosition === "outer" && borderW_px > 0 ? borderW_px : 0;
  const imgDestW =
    finalW -
    (borderPosition === "outer" && borderW_px > 0 ? 2 * borderW_px : 0);
  const imgDestH =
    finalH -
    (borderPosition === "outer" && borderW_px > 0 ? 2 * borderW_px : 0);

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    imgDestX,
    imgDestY,
    imgDestW,
    imgDestH,
  );

  // 3. Draw inner border on top of the image
  if (borderPosition === "inner" && borderW_px > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderW_px * 2; // Draw double width, as half is clipped
    ctx.strokeRect(0, 0, finalW, finalH);
  }

  // 4. Draw the black stroke at the inner edge of the border
  if (addStroke && strokeWidth_px > 0) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = strokeWidth_px;
    const strokeInset = borderW_px + strokeWidth_px / 2;

    if (finalW > 2 * strokeInset && finalH > 2 * strokeInset) {
      ctx.strokeRect(
        strokeInset,
        strokeInset,
        finalW - 2 * strokeInset,
        finalH - 2 * strokeInset,
      );
    }
  }

  // Return a Blob for offscreen canvases or for further processing
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({
      type: "image/png",
      quality: JPEG_QUALITY,
    });
  }
  return new Promise((resolve) => {
    (canvas as HTMLCanvasElement).toBlob(resolve, "image/png", JPEG_QUALITY);
  });
};

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onProcess,
  onBack,
  queuePosition,
  queueLength,
  sheetMode,
}) => {
  const [currentImageSrc, setCurrentImageSrc] = useState(imageSrc);
  const [bgRemovedObjectUrl, setBgRemovedObjectUrl] = useState<string | null>(
    null,
  );
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedSizeName, setSelectedSizeName] = useState<string>(
    PASSPORT_SIZES[0].name,
  );
  const [customSize, setCustomSize] = useState({ width_mm: 0, height_mm: 0 });
  const [sourceDpi, setSourceDpi] = useState(300);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [borderWidth_mm, setBorderWidth_mm] = useState(0.5);
  const borderColor = "#FFFFFF";
  const [borderPosition, setBorderPosition] = useState<BorderPosition>("outer");
  const [addStroke, setAddStroke] = useState(false);
  const [downloadDpi, setDownloadDpi] = useState(300);
  const [estimatedSize, setEstimatedSize] = useState("");
  const [isCalculatingSize, setIsCalculatingSize] = useState(false);
  const [outputDimensions, setOutputDimensions] = useState({
    width: 0,
    height: 0,
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null); // For OffscreenCanvas

  const isSizeLocked = !!sheetMode;

  useEffect(() => {
    if (sheetMode) {
      if (sheetMode.mode === "standard" && sheetMode.size) {
        setSelectedSizeName(sheetMode.size.name);
      } else if (sheetMode.mode === "random") {
        setSelectedSizeName("Random Size");
      }
    }
  }, [sheetMode]);

  const selectedSize = useMemo<PassportSize>(() => {
    if (selectedSizeName === "Custom Size") {
      return { name: "Custom Size", ...customSize };
    }
    if (selectedSizeName === "Random Size") {
      return { name: "Random Size", width_mm: -1, height_mm: -1 };
    }
    return (
      PASSPORT_SIZES.find((s) => s.name === selectedSizeName) ||
      PASSPORT_SIZES[0]
    );
  }, [selectedSizeName, customSize]);

  const isCustomSize = selectedSizeName === "Custom Size";
  const isRandomSize = selectedSizeName === "Random Size";
  const aspect = isCustomSize
    ? undefined
    : !isRandomSize && selectedSize.width_mm > 0 && selectedSize.height_mm > 0
      ? selectedSize.width_mm / selectedSize.height_mm
      : undefined;

  // Reset image and crop when the source prop changes (e.g., next in queue)
  useEffect(() => {
    setCurrentImageSrc(imageSrc);
    setApiError(null);
    // Clean up previous blob URL if it exists
    if (bgRemovedObjectUrl) {
      URL.revokeObjectURL(bgRemovedObjectUrl);
      setBgRemovedObjectUrl(null);
    }
  }, [imageSrc]); // Removed bgRemovedObjectUrl from deps to prevent loop

  // Reset crop when the displayed image changes (original vs. bg-removed)
  useEffect(() => {
    if (imgRef.current) {
      setCrop(undefined);
    }
  }, [currentImageSrc]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (bgRemovedObjectUrl) {
        URL.revokeObjectURL(bgRemovedObjectUrl);
      }
    };
  }, [bgRemovedObjectUrl]);

  // Enhanced memory management for mobile devices
  useEffect(() => {
    const cleanup = () => {
      try {
        // Get device memory for optimization decisions
        const deviceMemory = (navigator as any).deviceMemory || 4;

        // Cleanup preview canvas
        if (previewCanvasRef.current) {
          const ctx = previewCanvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
          previewCanvasRef.current.width = 1;
          previewCanvasRef.current.height = 1;
        }

        // Cleanup offscreen canvas
        if (offscreenCanvasRef.current) {
          offscreenCanvasRef.current.width = 1;
          offscreenCanvasRef.current.height = 1;
          offscreenCanvasRef.current = null;
        }

        // Force cleanup of any remaining canvas elements
        const canvasElements = document.querySelectorAll('canvas');
        canvasElements.forEach(canvas => {
          if (canvas !== previewCanvasRef.current) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            canvas.width = 1;
            canvas.height = 1;
          }
        });

        // Optimized memory management - only request GC for low-memory devices
        if ((window as any).gc && deviceMemory < 4) {
          try {
            // Debounced GC call with longer intervals for performance
            if (performance.now() - (window as any).lastGC > 10000) { // 10 second minimum
              (window as any).gc();
              (window as any).lastGC = performance.now();
            }
          } catch (e) {
            // GC might not be available
          }
        }
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    };

    return cleanup;
  }, []);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  // Effect to recenter the crop when the aspect ratio changes (e.g., user selects a new size)
  useEffect(() => {
    if (imgRef.current && aspect) {
      const { width, height } = imgRef.current;
      if (width > 0 && height > 0) {
        setCrop(centerAspectCrop(width, height, aspect));
      }
    }
  }, [aspect]);

  // Initialize OffscreenCanvas if supported
  useEffect(() => {
    if (typeof OffscreenCanvas !== "undefined") {
      offscreenCanvasRef.current = new OffscreenCanvas(1, 1);
    }
  }, []);

  // Update Preview Canvas with enhanced mobile performance and memory management
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      selectedSize.name !== "Random Size"
    ) {
      // Increased debounce time for better mobile performance
      const timeoutId = setTimeout(async () => {
        try {
          const targetCanvas = offscreenCanvasRef.current || previewCanvasRef.current;
          if (!targetCanvas) {
            console.warn("No canvas available for preview rendering.");
            return;
          }

          // Check device memory before processing
          const deviceMemory = (navigator as any).deviceMemory || 4;
          if (deviceMemory < 2) {
            // For low-memory devices, use lower quality preview
            const ctx = targetCanvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingQuality = 'low';
            }
          }

          const blob = await drawOnCanvas(
            targetCanvas,
            imgRef.current,
            completedCrop,
            selectedSize,
            { borderWidth_mm, borderColor, borderPosition, addStroke },
            { isPreview: true },
          );

          if (blob && previewCanvasRef.current) {
            try {
              const bitmap = await createImageBitmap(blob);
              const ctx = previewCanvasRef.current.getContext("2d");
              if (ctx) {
                // Limit preview canvas size for mobile devices
                const maxPreviewSize = deviceMemory < 4 ? 150 : 200;
                const aspectRatio = bitmap.width / bitmap.height;
                
                let previewWidth = Math.min(bitmap.width, maxPreviewSize);
                let previewHeight = previewWidth / aspectRatio;
                
                if (previewHeight > maxPreviewSize) {
                  previewHeight = maxPreviewSize;
                  previewWidth = previewHeight * aspectRatio;
                }

                previewCanvasRef.current.width = previewWidth;
                previewCanvasRef.current.height = previewHeight;
                ctx.clearRect(0, 0, previewWidth, previewHeight);
                ctx.drawImage(bitmap, 0, 0, previewWidth, previewHeight);
              }
              bitmap.close(); // Release bitmap memory immediately
            } catch (bitmapError) {
              console.warn("Bitmap creation failed:", bitmapError);
            }
          }
        } catch (error) {
          console.warn("Canvas rendering failed:", error);
          // Don't throw error, just skip preview for this render
        }
      }, 300); // Debounce time for preview updates

      return () => {
        clearTimeout(timeoutId);
        // Enhanced cleanup
        if (previewCanvasRef.current) {
          const ctx = previewCanvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
        }
      };
    }
  }, [completedCrop, borderWidth_mm, borderPosition, addStroke, selectedSize]);

  // Calculate file size and dimensions with enhanced memory management
  useEffect(() => {
    if (
      !completedCrop?.width ||
      !imgRef.current ||
      !selectedSize ||
      selectedSize.width_mm <= 0
    ) {
      setEstimatedSize("");
      setOutputDimensions({ width: 0, height: 0 });
      return;
    }
    
    setIsCalculatingSize(true);
    const handler = setTimeout(async () => {
      let tempCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
      
      try {
        const pxPerMm = downloadDpi / 25.4;
        const finalW = Math.round(selectedSize.width_mm * pxPerMm);
        const finalH = Math.round(selectedSize.height_mm * pxPerMm);
        setOutputDimensions({ width: finalW, height: finalH });

        // Use existing offscreen canvas or create temporary one
        tempCanvas = offscreenCanvasRef.current || document.createElement("canvas");
        
        // Limit canvas size for mobile devices to prevent memory crashes
        const deviceMemory = (navigator as any).deviceMemory || 4;
        const maxCanvasPixels = deviceMemory < 4 ? 2000000 : 8000000; // 2MP vs 8MP
        const canvasPixels = finalW * finalH;
        
        if (canvasPixels > maxCanvasPixels) {
          // Scale down for low-memory devices
          const scale = Math.sqrt(maxCanvasPixels / canvasPixels);
          const scaledW = Math.round(finalW * scale);
          const scaledH = Math.round(finalH * scale);
          
          setOutputDimensions({ width: scaledW, height: scaledH });
          tempCanvas = document.createElement("canvas");
        }

        const blob = await drawOnCanvas(
          tempCanvas,
          imgRef.current!,
          completedCrop,
          selectedSize,
          { borderWidth_mm, borderColor, borderPosition, addStroke },
          { isPreview: false, dpi: downloadDpi },
        );

        if (blob) {
          setEstimatedSize(formatBytes(blob.size));
        } else {
          setEstimatedSize("N/A");
        }
        setIsCalculatingSize(false);
      } catch (error) {
        console.warn("File size calculation failed:", error);
        setEstimatedSize("N/A");
        setOutputDimensions({ width: 0, height: 0 });
        setIsCalculatingSize(false);
      } finally {
        // Cleanup temp canvas if it was created
        if (tempCanvas && !offscreenCanvasRef.current) {
          const canvas = tempCanvas as HTMLCanvasElement;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          canvas.width = 1;
          canvas.height = 1;
        }
      }
    }, 600); // Increased timeout for mobile devices

    return () => {
      clearTimeout(handler);
      setIsCalculatingSize(false);
    };
  }, [
    downloadDpi,
    completedCrop,
    selectedSize,
    borderWidth_mm,
    borderColor,
    borderPosition,
    addStroke,
  ]);

  // Calculate physical dimensions from freeform crop
  useEffect(() => {
    if (
      isCustomSize &&
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current
    ) {
      const image = imgRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const cropWidthInNaturalPixels = completedCrop.width * scaleX;
      const cropHeightInNaturalPixels = completedCrop.height * scaleY;

      if (sourceDpi > 0) {
        const width_mm = (cropWidthInNaturalPixels / sourceDpi) * 25.4;
        const height_mm = (cropHeightInNaturalPixels / sourceDpi) * 25.4;
        setCustomSize({ width_mm, height_mm });
      }
    }
  }, [completedCrop, sourceDpi, isCustomSize]);

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSizeName(e.target.value);
    if (e.target.value === "Custom Size") {
      setCrop(undefined); // Clear crop for freeform drawing
      setCompletedCrop(undefined);
      setCustomSize({ width_mm: 0, height_mm: 0 }); // Reset calculated dimensions
    }
  };

  const handleRemoveBackground = async () => {
    setApiError(null);

    setIsRemovingBg(true);
    try {
      console.log(
        "Background removal started for image:",
        currentImageSrc.substring(0, 50) + "...",
      );

      // [FIX 1] Use the actual background removal function
      const processedImageUrl = await removeBackground(currentImageSrc);

      console.log(
        "Background removal completed. Result length:",
        processedImageUrl.length,
      );

      // Clean up previous blob URL if it exists
      if (bgRemovedObjectUrl) {
        URL.revokeObjectURL(bgRemovedObjectUrl);
      }

      // Create new blob URL for the processed image
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      console.log("Background removal state updated successfully");
      setBgRemovedObjectUrl(objectUrl);
      setCurrentImageSrc(processedImageUrl); // Use the processed image (which might be a data URL)
    } catch (error) {
      console.error("Canvas background removal failed:", error);
      let errorMessage =
        "Sorry, there was an error removing the background using the built-in tool.";
      if (error instanceof Error) {
        if (error.message.includes("Failed to load image")) {
          errorMessage =
            "Could not load the image for processing. Please try a different image.";
        } else if (error.message.includes("Failed to get canvas context")) {
          errorMessage = "Canvas is not supported in this browser.";
        } else {
          errorMessage = error.message;
        }
      }
      setApiError(errorMessage);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleRestoreOriginal = () => {
    setCurrentImageSrc(imageSrc);
    // Clean up blob URL when restoring
    if (bgRemovedObjectUrl) {
      URL.revokeObjectURL(bgRemovedObjectUrl);
      setBgRemovedObjectUrl(null);
    }
  };

  const handleProcessClick = async (
    finalAction: "print" | "upload" = "print",
  ) => {
    if (!imgRef.current) return;

    try {
      if (isRandomSize) {
        const dataUrl = currentImageSrc; // Use current source (can be blob URL)
        const pixelDimensions = {
          width: imgRef.current.naturalWidth,
          height: imgRef.current.naturalHeight,
        };
        onProcess(dataUrl, selectedSize, pixelDimensions, finalAction);
      } else {
        if (!completedCrop?.width) return;
        
        // Create a new canvas for processing to avoid memory issues
        const processCanvas = document.createElement("canvas");
        
        // Apply memory limits for mobile devices
        const deviceMemory = (navigator as any).deviceMemory || 4;
        const maxProcessPixels = deviceMemory < 4 ? 3000000 : 12000000; // 3MP vs 12MP
        const targetDPI = deviceMemory < 4 ? Math.min(300, downloadDpi) : downloadDpi;
        
        const pxPerMm = targetDPI / 25.4;
        const finalW = Math.round(selectedSize.width_mm * pxPerMm);
        const finalH = Math.round(selectedSize.height_mm * pxPerMm);
        const canvasPixels = finalW * finalH;
        
        if (canvasPixels > maxProcessPixels) {
          // Scale down DPI for low-memory devices
          const scale = Math.sqrt(maxProcessPixels / canvasPixels);
          const adjustedDPI = Math.round(targetDPI * scale);
          const adjustedPxPerMm = adjustedDPI / 25.4;
          
          processCanvas.width = Math.round(selectedSize.width_mm * adjustedPxPerMm);
          processCanvas.height = Math.round(selectedSize.height_mm * adjustedPxPerMm);
        } else {
          processCanvas.width = finalW;
          processCanvas.height = finalH;
        }

        const blob = await drawOnCanvas(
          processCanvas,
          imgRef.current,
          completedCrop,
          selectedSize,
          { borderWidth_mm, borderColor, borderPosition, addStroke },
          { isPreview: false, dpi: targetDPI },
        );

        if (blob) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read processed image"));
            reader.readAsDataURL(blob);
          });
          
          // Cleanup canvas immediately
          const ctx = processCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, processCanvas.width, processCanvas.height);
          }
          
          onProcess(dataUrl, selectedSize, undefined, finalAction);
        } else {
          throw new Error("Failed to generate image blob for processing.");
        }
      }
    } catch (error) {
      console.error("Process canvas operation failed:", error);
      // Enhanced error handling for mobile devices
      const deviceMemory = (navigator as any).deviceMemory || 4;
      if (deviceMemory < 4) {
        alert(
          "Processing failed due to device memory limitations. Please try with a smaller image or restart the app."
        );
      } else {
        alert(
          "Processing failed. Please try again or contact support if the issue persists."
        );
      }
    }
  };

  const handleDownloadClick = async () => {
    if (
      !completedCrop ||
      !imgRef.current ||
      !selectedSize ||
      selectedSize.width_mm <= 0
    )
      return;

    const downloadCanvas =
      offscreenCanvasRef.current || document.createElement("canvas");
    try {
      const blob = await drawOnCanvas(
        downloadCanvas,
        imgRef.current,
        completedCrop,
        selectedSize,
        { borderWidth_mm, borderColor, borderPosition, addStroke },
        { isPreview: false, dpi: downloadDpi },
      );

      if (blob) {
        const dataUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = dataUrl;
        const safeName = selectedSize.name.replace(/[^a-zA-Z0-9]/g, "_");
        link.download = `passport_photo_${safeName}_${downloadDpi}dpi.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dataUrl); // Clean up the object URL
      } else {
        throw new Error("Failed to generate image blob for download.");
      }
    } catch (error) {
      console.error("Download canvas operation failed:", error);
      alert(
        "Download failed due to memory constraints. Try with a lower DPI setting.",
      );
    }
  };

  const hasBgBeenRemoved = currentImageSrc !== imageSrc;

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 safe-bottom">
      <div className="flex-grow bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-3 sm:p-4 md:p-6 flex flex-col">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-[var(--text-primary)]">
          {isRandomSize || isCustomSize ? "Image Preview" : "Crop Your Image"}
        </h2>
        {queueLength && queueLength > 1 && queuePosition && (
          <div className="text-center mb-3 sm:mb-4 bg-[var(--control-bg)]/80 p-2 rounded-lg">
            <p className="font-semibold text-[var(--accent-primary)] text-sm sm:text-base">
              Processing image {queuePosition} of {queueLength}
            </p>
          </div>
        )}
        <div className="bg-black/50 rounded-lg flex-grow flex justify-center items-center min-h-[35vh] sm:min-h-[40vh]">
          {isRandomSize ? (
            <img
              ref={imgRef}
              src={currentImageSrc}
              alt="Preview"
              className="max-h-[50vh] sm:max-h-[65vh] object-contain"
              onLoad={onImageLoad}
              crossOrigin="anonymous"
            />
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="max-h-[50vh] sm:max-h-[65vh] flex items-center justify-center"
            >
              <img
                ref={imgRef}
                src={currentImageSrc}
                alt="Crop preview"
                className="max-h-[50vh] sm:max-h-[65vh] object-contain"
                onLoad={onImageLoad}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
        </div>
      </div>

      <div className="lg:w-[380px] flex-shrink-0 flex flex-col gap-y-4 sm:gap-y-6">
        <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-4 sm:p-6 flex flex-col space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] -mt-1 mb-1">
            Finalize Image
          </h2>
          <button
            onClick={() => handleProcessClick("print")}
            disabled={isRandomSize ? !imgRef.current : !completedCrop?.width}
            className="w-full flex items-center justify-center bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-3 px-4 rounded-lg transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] focus-visible:ring-[var(--accent-primary)] min-h-touch touch-target"
          >
            <CropIcon className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Add to </span>Print Sheet
          </button>
          <button
            onClick={() => handleProcessClick("upload")}
            className="w-full flex items-center justify-center bg-[var(--control-bg)] hover:bg-[var(--control-bg)]/80 text-[var(--text-secondary)] font-bold py-2 sm:py-2 px-4 rounded-lg transition-colors duration-200 active:scale-[0.98] min-h-touch touch-target"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Add & </span>Upload More
          </button>
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center bg-[var(--control-bg)] hover:bg-[var(--control-bg)]/80 text-[var(--text-secondary)] font-bold py-2 sm:py-2 px-4 rounded-lg transition-colors duration-200 active:scale-[0.98] min-h-touch touch-target"
          >
            <BackIcon className="w-5 h-5 mr-2" />
            Start Over
          </button>
        </div>

        <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
            Editing Options
          </h2>
          <div className="space-y-5">
            <div>
              <label
                htmlFor="size-select"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Passport Size
              </label>
              <select
                id="size-select"
                value={selectedSizeName}
                onChange={handleSizeChange}
                disabled={isSizeLocked}
                className="w-full bg-[var(--control-bg)] border border-[var(--control-border)] rounded-md py-2 px-3 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {PASSPORT_SIZES.map((size) => (
                  <option key={size.name} value={size.name}>
                    {size.name}
                  </option>
                ))}
              </select>
              {isSizeLocked && (
                <p className="mt-2 text-xs text-[var(--text-tertiary)] p-2 bg-[var(--control-bg)]/80 rounded-md border border-[var(--control-border)]">
                  Size is locked to match the current print sheet. To use a
                  different size, please "Start Over".
                </p>
              )}
            </div>

            {isCustomSize && (
              <div className="p-3 bg-[var(--control-bg)]/80 rounded-md border border-[var(--control-border)] space-y-3">
                <p className="text-xs text-center text-[var(--text-tertiary)] -mt-1">
                  Draw a crop box on the image to define its physical size.
                </p>
                <div>
                  <label
                    htmlFor="source-dpi"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    Source Image DPI
                  </label>
                  <input
                    type="number"
                    id="source-dpi"
                    value={sourceDpi}
                    onChange={(e) =>
                      setSourceDpi(Math.max(1, Number(e.target.value)))
                    }
                    min="1"
                    className="w-full bg-[var(--background-start-rgb)] border border-[var(--control-border)] rounded-md py-1 px-2 text-sm text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Calculated Width
                    </label>
                    <div className="w-full bg-[var(--background-start-rgb)] border border-[var(--control-border)] rounded-md py-1 px-2 text-sm text-[var(--text-primary)] truncate">
                      {customSize.width_mm.toFixed(1)} mm
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Calculated Height
                    </label>
                    <div className="w-full bg-[var(--background-start-rgb)] border border-[var(--control-border)] rounded-md py-1 px-2 text-sm text-[var(--text-primary)] truncate">
                      {customSize.height_mm.toFixed(1)} mm
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isRandomSize && (
              <div className="p-3 bg-[var(--control-bg)]/80 rounded-md border border-[var(--control-border)] text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  The crop step is skipped for 'Random Size'. The full image
                  will be added to the print sheet.
                </p>
              </div>
            )}

            {!isRandomSize && (
              <>
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-lg border border-[var(--control-border)] space-y-3">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] -mt-1">
                    Background Removal Tool
                  </h3>
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg || hasBgBeenRemoved}
                    className="w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 active:scale-95"
                  >
                    <MagicWandIcon className="w-5 h-5 mr-2" />
                    {isRemovingBg ? "Processing..." : "Remove Background"}
                  </button>
                  {hasBgBeenRemoved && (
                    <button
                      onClick={handleRestoreOriginal}
                      className="w-full text-center text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] py-1 transition-colors"
                    >
                      Restore Original
                    </button>
                  )}
                  {apiError && (
                    <div
                      className="mt-2 text-sm text-yellow-400 bg-yellow-900/50 border border-yellow-800 p-3 rounded-md"
                      role="alert"
                    >
                      <p className="font-bold">Processing Error</p>
                      <p>{apiError}</p>
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                    Built-in tool: Background will be replaced with solid white.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="border-width-slider"
                    className="flex justify-between text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    <span>Border Width</span>
                    <span className="font-bold text-[var(--accent-primary)]">
                      {borderWidth_mm.toFixed(1)} mm
                    </span>
                  </label>
                  <input
                    type="range"
                    id="border-width-slider"
                    name="border-width-slider"
                    value={borderWidth_mm}
                    onChange={(e) => setBorderWidth_mm(Number(e.target.value))}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full h-2 bg-[var(--control-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Border Position
                  </label>
                  <div className="flex w-full bg-[var(--control-bg)] rounded-md p-1 border border-[var(--control-border)]">
                    <button
                      onClick={() => setBorderPosition("outer")}
                      className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-colors ${borderPosition === "outer" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-black/5"}`}
                    >
                      Outer
                    </button>
                    <button
                      onClick={() => setBorderPosition("inner")}
                      className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-colors ${borderPosition === "inner" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-black/5"}`}
                    >
                      Inner
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[var(--control-bg)]/80 p-3 rounded-lg">
                  <label
                    htmlFor="stroke-toggle"
                    className="text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Add 0.1mm Black Stroke
                  </label>
                  <button
                    id="stroke-toggle"
                    role="switch"
                    aria-checked={addStroke}
                    onClick={() => setAddStroke((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] focus-visible:ring-[var(--accent-primary)] ${addStroke ? "bg-[var(--accent-primary)]" : "bg-[var(--control-border)]"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${addStroke ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Live Preview
                  </h3>
                  <div className="bg-[var(--control-bg)]/50 dark:bg-black/20 rounded-lg p-4 flex flex-col justify-center items-center min-h-[150px] border border-[var(--control-border)]">
                    {!isRandomSize ? (
                      <>
                        <canvas
                          ref={previewCanvasRef}
                          className="max-w-full h-auto rounded shadow-lg shadow-[var(--shadow-color)]"
                        />
                        {selectedSize.width_mm > 0 && (
                          <p className="text-xs text-[var(--text-tertiary)] font-medium mt-3 bg-[var(--control-bg)] px-2 py-1 rounded-full">
                            {selectedSize.width_mm.toFixed(1)}mm x{" "}
                            {selectedSize.height_mm.toFixed(1)}mm
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-center text-[var(--text-tertiary)]">
                        Preview is available on the final print page for 'Random
                        Size' images.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {!isRandomSize && (
          <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Download Single Image
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="dpi-slider"
                  className="flex justify-between text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  <span>Resolution (DPI)</span>
                  <span className="font-bold text-[var(--accent-primary)]">
                    {downloadDpi} DPI
                  </span>
                </label>
                <input
                  id="dpi-slider"
                  type="range"
                  min="72"
                  max="600"
                  step="1"
                  value={downloadDpi}
                  onChange={(e) => setDownloadDpi(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--control-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                  aria-label="Download resolution in DPI"
                />
              </div>
              <div className="text-center space-y-1 text-xs text-[var(--text-secondary)] p-3 bg-[var(--control-bg)]/80 rounded-lg">
                <p>
                  <span className="font-semibold text-[var(--text-secondary)]">
                    Physical Size:{" "}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedSize.width_mm > 0
                      ? `${selectedSize.width_mm.toFixed(1)}mm x ${selectedSize.height_mm.toFixed(1)}mm`
                      : "N/A"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-[var(--text-secondary)]">
                    Pixel Dimensions:{" "}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {outputDimensions.width > 0
                      ? `${outputDimensions.width} x ${outputDimensions.height} px`
                      : "N/A"}
                  </span>
                </p>
              </div>
              <div className="text-sm text-center bg-[var(--control-bg)]/80 p-2 rounded-md border border-[var(--control-border)]">
                <span className="text-[var(--text-secondary)]">
                  Est. File Size:{" "}
                </span>
                <span className="font-semibold text-[var(--text-primary)] h-5 inline-block w-20">
                  {isCalculatingSize ? "..." : estimatedSize}
                </span>
              </div>
              <button
                onClick={handleDownloadClick}
                disabled={!completedCrop?.width || isCalculatingSize}
                className="w-full flex items-center justify-center bg-[var(--accent-secondary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-200 active:scale-[0.98]"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCropper;
