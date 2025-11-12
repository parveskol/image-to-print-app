/**
 * High-performance image processing utilities optimized for mobile devices
 * Features:
 * - Memory-efficient canvas operations
 * - Progressive loading and processing
 * - Automatic quality vs size optimization
 */

export interface ProcessingConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  preserveAspectRatio: boolean;
}

export interface PerformanceMetrics {
  resizeTime: number;
  processTime: number;
  memoryUsage: number;
  finalSize: number;
}

class OptimizedImageProcessor {
  private isWebPSupported: boolean = false;
  
  constructor() {
    this.checkWebPSupport();
  }

  private checkWebPSupport(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 1, 1);
      this.isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
  }

  /**
   * Resize image with optimal quality for mobile devices
   */
  async resizeImage(
    imageSrc: string, 
    maxWidth: number, 
    maxHeight: number,
    quality: number = 0.8,
    targetFormat: 'jpeg' | 'png' | 'webp' = 'webp'
  ): Promise<{ dataUrl: string; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Calculate optimal dimensions
          let { width, height } = img;
          let scale = 1;
          
          if (width > maxWidth) {
            scale = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * scale);
          }
          
          if (height > maxHeight) {
            scale = maxHeight / height;
            height = maxHeight;
            width = Math.round(width * scale);
          }
          
          // Use regular canvas for better compatibility
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Set quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw image with optimal scaling
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to optimal format
          let format = targetFormat;
          if (format === 'webp' && !this.isWebPSupported) {
            format = 'jpeg';
          }
          
          const resizeEndTime = performance.now();
          
          // Convert to data URL with quality settings
          const dataUrl = canvas.toDataURL(`image/${format}`, quality);
          const processEndTime = performance.now();
          
          // Clean up
          img.src = '';
          
          const metrics: PerformanceMetrics = {
            resizeTime: resizeEndTime - startTime,
            processTime: processEndTime - resizeEndTime,
            memoryUsage: this.getMemoryUsage(),
            finalSize: dataUrl.length
          };
          
          resolve({ dataUrl, metrics });
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  }

  /**
   * Fast background removal optimized for mobile
   */
  async fastBackgroundRemoval(
    imageSrc: string,
    threshold: number = 30
  ): Promise<{ dataUrl: string; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          
          // Fast edge detection using luminance
          const luminance = new Uint8Array(img.width * img.height);
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            luminance[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          }
          
          // Create edge map and background mask
          const edgeMap = new Uint8ClampedArray(img.width * img.height);
          const bgMask = new Uint8ClampedArray(img.width * img.height);
          
          for (let y = 1; y < img.height - 1; y++) {
            for (let x = 1; x < img.width - 1; x++) {
              const idx = y * img.width + x;
              const left = luminance[idx - 1];
              const right = luminance[idx + 1];
              const top = luminance[idx - img.width];
              const bottom = luminance[idx + img.width];
              
              const horizontal = Math.abs(right - left);
              const vertical = Math.abs(bottom - top);
              const edgeStrength = horizontal + vertical;
              
              edgeMap[idx] = edgeStrength > threshold ? 255 : 0;
              
              // Simple background detection - white or very bright areas
              const pixelIdx = idx * 4;
              const avg = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
              bgMask[idx] = avg > 200 ? 1 : 0;
            }
          }
          
          // Apply background removal with edge preservation
          for (let i = 0; i < data.length; i += 4) {
            const pixelIdx = i / 4;
            
            if (bgMask[pixelIdx] === 1 && edgeMap[pixelIdx] === 0) {
              // Background pixel without edges - remove
              data[i + 3] = 0; // Set alpha to 0
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          const result = canvas.toDataURL('image/png');
          
          const endTime = performance.now();
          
          // Clean up
          img.src = '';
          
          const metrics: PerformanceMetrics = {
            resizeTime: 0,
            processTime: endTime - startTime,
            memoryUsage: this.getMemoryUsage(),
            finalSize: result.length
          };
          
          resolve({ dataUrl: result, metrics });
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  }

  /**
   * Batch process multiple images with memory management
   */
  async batchProcess(
    imageSrcs: string[],
    config: Partial<ProcessingConfig> = {}
  ): Promise<Array<{ dataUrl: string; metrics: PerformanceMetrics }>> {
    const defaultConfig: ProcessingConfig = {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      format: 'webp',
      preserveAspectRatio: true,
      ...config
    };
    
    const results: Array<{ dataUrl: string; metrics: PerformanceMetrics }> = [];
    
    // Process images sequentially to avoid memory issues
    for (let i = 0; i < imageSrcs.length; i++) {
      try {
        const result = await this.resizeImage(
          imageSrcs[i],
          defaultConfig.maxWidth,
          defaultConfig.maxHeight,
          defaultConfig.quality,
          defaultConfig.format
        );
        results.push(result);
        
        // Force garbage collection between images if available
        if (i % 3 === 0 && (window as any).gc) {
          try {
            (window as any).gc();
          } catch (e) {
            // GC might not be available
          }
        }
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error);
        // Continue processing other images
      }
    }
    
    return results;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Cleanup any remaining resources
  }

  /**
   * Get performance recommendations for current device
   */
  static getDeviceRecommendations(): ProcessingConfig {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const memory = (performance as any)?.memory?.heapSizeLimit || 0;
    
    if (isMobile) {
      if (memory > 512 * 1024 * 1024) { // High-end mobile
        return {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.8,
          format: 'webp',
          preserveAspectRatio: true
        };
      } else { // Low-end mobile
        return {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.7,
          format: 'jpeg',
          preserveAspectRatio: true
        };
      }
    } else { // Desktop
      return {
        maxWidth: 4096,
        maxHeight: 4096,
        quality: 0.9,
        format: 'webp',
        preserveAspectRatio: true
      };
    }
  }
}

export const optimizedImageProcessor = new OptimizedImageProcessor();

// Export the class for static methods
export { OptimizedImageProcessor };

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    optimizedImageProcessor.destroy();
  });
}