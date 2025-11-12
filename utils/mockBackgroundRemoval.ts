/**
 * Mock background removal - just returns the original image
 * This is a test to verify the pipeline works
 */

export async function mockRemoveBackground(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('MOCK: Starting with image:', imageSrc.substring(0, 50) + '...');
    
    // Simulate processing delay
    setTimeout(() => {
      console.log('MOCK: Returning original image');
      // Just return the original image unchanged
      resolve(imageSrc);
    }, 1000);
  });
}