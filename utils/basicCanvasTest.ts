/**
 * Basic Canvas test - just draws a red rectangle to verify Canvas functionality
 */

export async function basicCanvasTest(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('BASIC TEST: Image loaded:', img.width, 'x', img.height);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('BASIC TEST: Failed to get canvas context');
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        console.log('BASIC TEST: Canvas context obtained');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image first
        ctx.drawImage(img, 0, 0);
        console.log('BASIC TEST: Original image drawn');
        
        // Draw a red rectangle on top
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 50, 50);
        console.log('BASIC TEST: Red rectangle drawn');
        
        // Convert to data URL
        const result = canvas.toDataURL('image/png');
        console.log('BASIC TEST: Data URL created, length:', result.length);
        
        if (!result || result.length === 0) {
          console.error('BASIC TEST: Empty data URL generated');
          reject(new Error('Failed to generate data URL'));
          return;
        }
        
        console.log('BASIC TEST: Success! Returning result');
        resolve(result);
        
      } catch (error) {
        console.error('BASIC TEST: Error in onload:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('BASIC TEST: Image load error:', error);
      reject(new Error('Failed to load image'));
    };
    
    console.log('BASIC TEST: Starting with src:', imageSrc.substring(0, 50) + '...');
    img.src = imageSrc;
  });
}