/**
 * Manual background removal tool
 * User clicks on background color to remove it
 */

export interface BackgroundRemovalConfig {
  tolerance?: number;
}

const DEFAULT_CONFIG: BackgroundRemovalConfig = {
  tolerance: 30, // Color tolerance for replacement
};

export async function manualRemoveBackground(
  imageSrc: string, 
  backgroundColor: { r: number; g: number; b: number },
  config: BackgroundRemovalConfig = DEFAULT_CONFIG
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('Manual background removal started for:', img.width, 'x', img.height);
        console.log('Target background color:', backgroundColor);
        
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
        const { tolerance } = { ...DEFAULT_CONFIG, ...config };
        
        console.log('Using tolerance:', tolerance);
        
        // Replace background pixels
        let changedPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate color distance
          const distance = Math.sqrt(
            Math.pow(r - backgroundColor.r, 2) +
            Math.pow(g - backgroundColor.g, 2) +
            Math.pow(b - backgroundColor.b, 2)
          );
          
          // If pixel is within tolerance, replace with white
          if (distance <= tolerance) {
            data[i] = 255;     // Red
            data[i + 1] = 255; // Green
            data[i + 2] = 255; // Blue
            data[i + 3] = 255; // Alpha
            changedPixels++;
          }
        }
        
        console.log('Changed', changedPixels, 'pixels to white');
        
        // Put modified data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to data URL
        const result = canvas.toDataURL('image/png');
        console.log('Manual background removal completed, result length:', result.length);
        resolve(result);
        
      } catch (error) {
        console.error('Manual background removal failed:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageSrc;
  });
}

/**
 * Get color from image at specific coordinates
 */
export function getColorAtPoint(
  imageElement: HTMLImageElement,
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): { r: number; g: number; b: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  try {
    const pixel = ctx.getImageData(x, y, 1, 1);
    const data = pixel.data;
    
    return {
      r: data[0],
      g: data[1],
      b: data[2]
    };
  } catch (error) {
    console.error('Failed to get pixel color:', error);
    return null;
  }
}