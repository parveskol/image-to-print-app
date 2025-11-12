/**
 * Canvas-based background removal utility
 * Uses flood fill algorithm to identify and remove backgrounds
 */

export interface BackgroundRemovalOptions {
  maxBackgroundColorDiff?: number;
}

const DEFAULT_OPTIONS: BackgroundRemovalOptions = {
  maxBackgroundColorDiff: 80, // Increased tolerance for better background detection
};

/**
 * Calculate color distance between two RGB values
 */
function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2),
  );
}

/**
 * Get average color from image data starting from corners
 */
function getBackgroundColor(imageData: ImageData): {
  r: number;
  g: number;
  b: number;
} {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const cornerColors: Array<{ r: number; g: number; b: number }> = [];

  // Sample colors from all four corners and edge pixels
  const samplePoints = [
    0, // top-left
    width * 4 - 4, // top-right
    width * (height - 1) * 4, // bottom-left
    width * height * 4 - 4, // bottom-right
    width * 2 * 4, // top edge
    width * (height - 1) * 4 + width * 2 * 4, // bottom edge
    height * 2 * 4, // left edge
    (height * 2 + width - 1) * 4, // right edge
  ];

  samplePoints.forEach((index) => {
    if (index >= 0 && index < data.length) {
      cornerColors.push({
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
      });
    }
  });

  // Average the corner colors
  if (cornerColors.length === 0) return { r: 255, g: 255, b: 255 };

  const avgR = Math.round(
    cornerColors.reduce((sum, color) => sum + color.r, 0) / cornerColors.length,
  );
  const avgG = Math.round(
    cornerColors.reduce((sum, color) => sum + color.g, 0) / cornerColors.length,
  );
  const avgB = Math.round(
    cornerColors.reduce((sum, color) => sum + color.b, 0) / cornerColors.length,
  );

  return { r: avgR, g: avgG, b: avgB };
}

/**
 * Remove background from an image using canvas-based processing
 */
export async function removeBackground(
  imageSrc: string,
  options: BackgroundRemovalOptions = DEFAULT_OPTIONS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeout: NodeJS.Timeout;

    // Only set crossOrigin for external URLs, not data URLs
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    console.log(
      "Canvas background removal called for:",
      imageSrc.substring(0, 50) + "...",
    );

    // Handle timeout
    timeout = setTimeout(() => {
      reject(new Error("Background removal timed out after 30 seconds"));
    }, 30000);

    img.onload = () => {
      // Clear timeout when image loads successfully
      clearTimeout(timeout);
      
      try {
        // Create canvas and load image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          console.error("Failed to get canvas context");
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Limit canvas size to prevent memory issues
        const maxDimension = 2000;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          const scale = Math.min(maxDimension / width, maxDimension / height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }

        canvas.width = width;
        canvas.height = height;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Get background color from corners (more samples for better accuracy)
        const backgroundColor = getBackgroundColor(imageData);
        const { maxBackgroundColorDiff } = { ...DEFAULT_OPTIONS, ...options };

        // Create a mask for background pixels
        const isBackground = new Uint8Array(canvas.width * canvas.height);

        // Optimized flood fill from corners with stack size limit
        function floodFillFromPoint(startX: number, startY: number) {
          const stack = [{ x: startX, y: startY }];
          const maxStackSize = 100000; // Prevent stack overflow

          while (stack.length > 0 && stack.length < maxStackSize) {
            const { x, y } = stack.pop()!;

            // Check bounds
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              continue;

            const pixelIndex = y * canvas.width + x;

            // Skip if already processed
            if (isBackground[pixelIndex]) continue;

            // Get pixel color
            const dataIndex = pixelIndex * 4;
            const pixelR = data[dataIndex];
            const pixelG = data[dataIndex + 1];
            const pixelB = data[dataIndex + 2];
            const pixelA = data[dataIndex + 3];

            // Skip fully transparent pixels
            if (pixelA < 10) {
              isBackground[pixelIndex] = 1;
              continue;
            }

            // Check if pixel is background-like
            const distance = colorDistance(
              pixelR,
              pixelG,
              pixelB,
              backgroundColor.r,
              backgroundColor.g,
              backgroundColor.b,
            );

            if (distance <= maxBackgroundColorDiff) {
              // Mark as background
              isBackground[pixelIndex] = 1;

              // Add neighboring pixels to stack (only cardinal directions)
              stack.push({ x: x - 1, y: y });
              stack.push({ x: x + 1, y: y });
              stack.push({ x: x, y: y - 1 });
              stack.push({ x: x, y: y + 1 });
            }
          }
        }

        // Start flood fill from all corners and edges
        const samplePoints = [
          { x: 0, y: 0 },
          { x: canvas.width - 1, y: 0 },
          { x: 0, y: canvas.height - 1 },
          { x: canvas.width - 1, y: canvas.height - 1 },
          { x: Math.floor(canvas.width / 2), y: 0 },
          { x: Math.floor(canvas.width / 2), y: canvas.height - 1 },
          { x: 0, y: Math.floor(canvas.height / 2) },
          { x: canvas.width - 1, y: Math.floor(canvas.height / 2) },
        ];

        samplePoints.forEach((point) => {
          floodFillFromPoint(point.x, point.y);
        });

        // Replace background pixels with white
        for (let i = 0; i < isBackground.length; i++) {
          if (isBackground[i] === 1) {
            const dataIndex = i * 4;
            data[dataIndex] = 255; // Red
            data[dataIndex + 1] = 255; // Green
            data[dataIndex + 2] = 255; // Blue
            data[dataIndex + 3] = 255; // Alpha (opaque)
          }
        }

        // Put the modified data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL with quality control
        const dataUrl = canvas.toDataURL("image/png", 0.95);

        // Clean up
        canvas.width = 1;
        canvas.height = 1;

        console.log("Background removal completed successfully");
        resolve(dataUrl);
      } catch (error) {
        console.error("Background removal error:", error);
        reject(
          error instanceof Error
            ? error
            : new Error("Unknown background removal error"),
        );
      }
    };

    img.onerror = (error) => {
      clearTimeout(timeout);
      console.error("Failed to load image for background removal:", error);
      reject(
        new Error(
          "Failed to load image for background removal. Please check if the image is valid.",
        ),
      );
    };

    img.src = imageSrc;
  });
}

/**
 * Check if canvas-based background removal is supported
 */
export function isBackgroundRemovalSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    return !!(ctx && typeof ctx.getImageData === "function");
  } catch {
    return false;
  }
}
