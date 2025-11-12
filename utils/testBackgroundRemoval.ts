/**
 * Simple test background removal - just turns the image white
 * This is a basic test to verify the Canvas functionality works
 */

export async function testRemoveBackground(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('TEST: Image loaded successfully:', img.width, 'x', img.height);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Simply fill with white color
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        console.log('TEST: Canvas created and filled with white');
        
        // Convert to data URL
        const result = canvas.toDataURL('image/png');
        console.log('TEST: Result generated, length:', result.length);
        resolve(result);
        
      } catch (error) {
        console.error('TEST: Background removal failed:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageSrc;
  });
}