import React, { useCallback, useState, useRef, useEffect } from "react";
import { UploadIcon, CameraIcon } from "./icons";
import { optimizedImageProcessor, OptimizedImageProcessor } from "../utils/optimizedImageProcessor";
import { performanceMonitor } from "../utils/performanceMonitor";

interface OptimizedImageUploaderProps {
  onImagesUpload: (imageDataUrls: string[]) => void;
  onError?: (error: string) => void;
}

const OptimizedImageUploader: React.FC<OptimizedImageUploaderProps> = ({ 
  onImagesUpload, 
  onError 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Get performance-optimized settings
  const [optimizationSettings, setOptimizationSettings] = useState(() =>
    OptimizedImageProcessor.getDeviceRecommendations()
  );

  useEffect(() => {
    // Update settings when performance metrics change
    const updateSettings = () => {
      const recommendations = performanceMonitor.getOptimizationRecommendations();
      const currentMetrics = performanceMonitor.getMetrics();
      
      if (recommendations.length > 0) {
        console.log('Performance recommendations:', recommendations);
      }
      
      // Adjust settings based on current performance
      const newSettings = { ...optimizationSettings };
      
      if (currentMetrics.memoryUsage > optimizationSettings.maxWidth * 0.8) {
        newSettings.maxWidth = Math.min(768, newSettings.maxWidth);
        newSettings.maxHeight = Math.min(768, newSettings.maxHeight);
      }
      
      if (currentMetrics.fps < 30) {
        newSettings.quality = Math.max(0.6, newSettings.quality - 0.1);
      }
      
      if (newSettings !== optimizationSettings) {
        setOptimizationSettings(newSettings);
      }
    };

    const interval = setInterval(updateSettings, 5000);
    return () => clearInterval(interval);
  }, [optimizationSettings]);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!file.type.startsWith("image/")) {
      return "Invalid file type. Please select an image file (PNG, JPG, WebP).";
    }

    // Check file size (max 10MB for mobile)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return "File too large. Please select an image under 10MB.";
    }

    // Check dimensions for mobile optimization
    return null;
  }, []);

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles: File[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        validationErrors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      onError?.(validationErrors.join('; '));
      return;
    }

    if (validFiles.length === 0) {
      setError("No valid image files selected.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      await processImages(validFiles);
    } catch (err) {
      console.error('Image processing failed:', err);
      setError("Failed to process images. Please try again.");
      onError?.("Image processing failed");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [validateFile, onError]);

  const processImages = useCallback(async (files: File[]) => {
    const processedImages: string[] = [];
    
    // Process images sequentially to avoid memory issues
    for (let i = 0; i < files.length; i++) {
      setProgress(((i + 1) / files.length) * 100);
      
      try {
        const file = files[i];
        const dataUrl = await fileToDataUrl(file);
        
        // Optimize image based on device capabilities
        const optimizedResult = await optimizedImageProcessor.resizeImage(
          dataUrl,
          optimizationSettings.maxWidth,
          optimizationSettings.maxHeight,
          optimizationSettings.quality,
          optimizationSettings.format as 'jpeg' | 'png' | 'webp'
        );
        
        processedImages.push(optimizedResult.dataUrl);
        
        // Log performance metrics
        console.log(`Image ${i + 1}/${files.length} processed:`, {
          originalSize: dataUrl.length,
          optimizedSize: optimizedResult.dataUrl.length,
          compressionRatio: ((dataUrl.length - optimizedResult.dataUrl.length) / dataUrl.length * 100).toFixed(1) + '%',
          metrics: optimizedResult.metrics
        });
        
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error);
        // Continue processing other images
      }
    }
    
    if (processedImages.length > 0) {
      onImagesUpload(processedImages);
    } else {
      throw new Error("No images were successfully processed");
    }
  }, [optimizationSettings, onImagesUpload]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === "string") {
          resolve(e.target.result);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(new Error("File reading error"));
      reader.readAsDataURL(file);
    });
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleCameraCapture = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const getPerformanceIndicator = () => {
    const score = performanceMonitor.getPerformanceScore();
    const metrics = performanceMonitor.getMetrics();
    
    if (score >= 80) {
      return { color: 'text-green-500', text: 'Excellent', icon: '🟢' };
    } else if (score >= 60) {
      return { color: 'text-yellow-500', text: 'Good', icon: '🟡' };
    } else if (score >= 40) {
      return { color: 'text-orange-500', text: 'Fair', icon: '🟠' };
    } else {
      return { color: 'text-red-500', text: 'Poor', icon: '🔴' };
    }
  };

  const performanceIndicator = getPerformanceIndicator();

  return (
    <div
      className="app-container center min-h-[calc(100vh-8rem)] safe-bottom"
      style={{ padding: "1.5rem" }}
    >
      <div className="card w-full max-w-2xl animate-fade-in">
        <div className="flex flex-col gap-8 items-start">
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                Upload Your Photos
              </h2>
              <p className="text-[var(--text-secondary)] text-base">
                Optimized for your device performance
              </p>
            </div>

            {/* Performance Indicator */}
            <div className="mb-4 p-3 bg-[var(--control-bg)] rounded-lg flex items-center gap-2 text-sm">
              <span className="text-lg">{performanceIndicator.icon}</span>
              <span className={`font-medium ${performanceIndicator.color}`}>
                Performance: {performanceIndicator.text} ({performanceMonitor.getPerformanceScore()})
              </span>
              {performanceMonitor.getOptimizationRecommendations().length > 0 && (
                <button
                  onClick={() => console.log('Recommendations:', performanceMonitor.getOptimizationRecommendations())}
                  className="ml-2 text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  View Tips
                </button>
              )}
            </div>

            <div
              className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-all duration-500 ${
                isDragging
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 scale-[1.02] shadow-lg shadow-[var(--accent-primary)]/20"
                  : "border-[var(--control-border)] bg-[var(--control-bg)]/40 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--control-bg)]/60"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div
                  className={`transition-all duration-500 ${isDragging ? "scale-110 rotate-12" : "scale-100 rotate-0"}`}
                >
                  <UploadIcon className="w-16 h-16 text-[var(--accent-primary)] opacity-80" />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-base font-medium mb-1">
                    <label
                      htmlFor="file-upload"
                      className="font-bold text-[var(--accent-primary)] cursor-pointer hover:text-[var(--accent-primary-hover)] transition-colors duration-300 px-2 py-1 rounded-lg hover:bg-[var(--accent-primary)]/10"
                    >
                      Choose files
                    </label>{" "}
                    or drag them here
                  </p>
                  <p className="text-sm text-[var(--text-tertiary)] mt-2 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-[var(--control-bg)] px-2 py-1 rounded-md">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      PNG/JPG/WebP
                    </span>
                    <span className="inline-flex items-center gap-1 bg-[var(--control-bg)] px-2 py-1 rounded-md">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      Under 10MB
                    </span>
                  </p>
                </div>
              </div>
              
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Processing image {Math.round(progress)}%...
                    </p>
                  </div>
                </div>
              )}
              
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                ref={fileInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>

            <div className="divider-text my-6">
              <span>OR</span>
            </div>

            {/* Mobile camera capture */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                  e.target.value = ""; // Reset input
                }
              }}
            />
            <button
              onClick={handleCameraCapture}
              disabled={isProcessing}
              className="btn-modern primary w-full shadow-lg hover:shadow-xl cursor-pointer inline-flex items-center justify-center"
            >
              <CameraIcon className="w-5 h-5" />
              <span>Quick Capture (Mobile)</span>
            </button>

            {/* Performance warnings */}
            {performanceMonitor.getOptimizationRecommendations().length > 0 && (
              <div className="mt-4 p-3 bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/30 text-[var(--accent-warning)] rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 fill-current" viewBox="0 0 20 20">
                    <path d="M10 2C5.58172 2 2 5.58172 2 10s3.58172 8 8 8 8-3.58172 8-8-3.58172-8-8-8zm0 13a1 1 0 100-2 1 1 0 000 2zm1-3a1 1 0 10-2 0 1 1 0 002 0z"/>
                  </svg>
                  <div>
                    <p className="font-medium">Performance Optimization</p>
                    <p className="text-sm">
                      {performanceMonitor.getOptimizationRecommendations()[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 animate-slide-up">
                <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 text-[var(--accent-error)] p-4 rounded-xl flex items-start gap-3">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Upload Error</p>
                    <p className="text-sm whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedImageUploader;