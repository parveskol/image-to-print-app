/**
 * Reliable background removal using threshold-based approach
 * This is a more robust implementation that should work consistently
 */

export interface BackgroundRemovalConfig {
  threshold?: number; // Grayscale threshold for separating foreground/background
  edgeThreshold?: number; // Minimum edge strength to keep a pixel
  iterations?: number; // Number of morphological iterations
}

const DEFAULT_CONFIG: BackgroundRemovalConfig = {
  threshold: 128, // Mid-point for grayscale
  edgeThreshold: 20, // Minimum edge strength
  iterations: 2, // Morphological iterations
};

export async function reliableRemoveBackground(
  imageSrc: string,
  config: BackgroundRemovalConfig = DEFAULT_CONFIG
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('Reliable background removal started for:', img.width, 'x', img.height);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const { threshold, edgeThreshold, iterations } = { ...DEFAULT_CONFIG, ...config };
        
        console.log('Using config:', { threshold, edgeThreshold, iterations });
        
        // Step 1: Convert to grayscale
        const grayscale = new Uint8Array((canvas.width * canvas.height));
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          grayscale[Math.floor(i / 4)] = gray;
        }
        
        // Step 2: Create binary mask (foreground = 1, background = 0)
        const mask = new Uint8Array(canvas.width * canvas.height);
        
        // Use center region as likely foreground (assuming person is in center)
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const centerRadius = Math.min(centerX, centerY) * 0.6;
        
        let backgroundPixels = 0;
        let foregroundPixels = 0;
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = y * canvas.width + x;
            const gray = grayscale[idx];
            
            // Calculate distance from center
            const distFromCenter = Math.sqrt(
              Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );
            
            // If pixel is far from center OR very light/dark, likely background
            if (distFromCenter > centerRadius || gray < threshold || gray > 255 - threshold) {
              mask[idx] = 0; // Background
              backgroundPixels++;
            } else {
              mask[idx] = 1; // Foreground
              foregroundPixels++;
            }
          }
        }
        
        console.log('Initial mask - Foreground:', foregroundPixels, 'Background:', backgroundPixels);
        
        // Step 3: Morphological operations to clean up the mask
        for (let iter = 0; iter < iterations; iter++) {
          // Simple erosion and dilation
          const newMask = new Uint8Array(mask.length);
          
          for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
              const idx = y * canvas.width + x;
              
              // Check 3x3 neighborhood
              let allForeground = true;
              for (let dy = -1; dy <= 1 && allForeground; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (mask[(y + dy) * canvas.width + (x + dx)] === 0) {
                    allForeground = false;
                    break;
                  }
                }
              }
              
              newMask[idx] = allForeground ? 1 : 0;
            }
          }
          
          // Copy borders
          for (let x = 0; x < canvas.width; x++) {
            newMask[x] = mask[x]; // Top row
            newMask[(canvas.height - 1) * canvas.width + x] = mask[(canvas.height - 1) * canvas.width + x]; // Bottom row
          }
          for (let y = 0; y < canvas.height; y++) {
            newMask[y * canvas.width] = mask[y * canvas.width]; // Left column
            newMask[y * canvas.width + canvas.width - 1] = mask[y * canvas.width + canvas.width - 1]; // Right column
          }
          
          mask.set(newMask);
        }
        
        // Step 4: Apply edge detection to refine boundaries
        const edges = new Uint8Array(canvas.width * canvas.height);
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = y * canvas.width + x;
            
            // Simple Sobel edge detection
            const sobelX = Math.abs(
              -grayscale[(y-1) * canvas.width + (x-1)] + grayscale[(y-1) * canvas.width + (x+1)] +
              -2 * grayscale[y * canvas.width + (x-1)] + 2 * grayscale[y * canvas.width + (x+1)] +
              -grayscale[(y+1) * canvas.width + (x-1)] + grayscale[(y+1) * canvas.width + (x+1)]
            );
            
            const sobelY = Math.abs(
              -grayscale[(y-1) * canvas.width + (x-1)] - 2 * grayscale[(y-1) * canvas.width + x] - grayscale[(y-1) * canvas.width + (x+1)] +
              grayscale[(y+1) * canvas.width + (x-1)] + 2 * grayscale[(y+1) * canvas.width + x] + grayscale[(y+1) * canvas.width + (x+1)]
            );
            
            const edgeStrength = Math.sqrt(sobelX * sobelX + sobelY * sobelY);
            edges[idx] = edgeStrength > edgeThreshold ? 1 : 0;
          }
        }
        
        // Step 5: Create final result
        let keptPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const idx = Math.floor(i / 4);
          
          // Keep pixel if it's foreground OR has strong edges
          if (mask[idx] === 1 || edges[idx] === 1) {
            // Pixel is part of foreground, keep original color
            keptPixels++;
          } else {
            // Pixel is background, replace with white
            data[i] = 255;     // Red
            data[i + 1] = 255; // Green
            data[i + 2] = 255; // Blue
            data[i + 3] = 255; // Alpha
          }
        }
        
        console.log('Kept', keptPixels, 'foreground pixels');
        
        // Put modified data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to data URL
        const result = canvas.toDataURL('image/png');
        console.log('Reliable background removal completed, result length:', result.length);
        resolve(result);
        
      } catch (error) {
        console.error('Reliable background removal failed:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageSrc;
  });
}