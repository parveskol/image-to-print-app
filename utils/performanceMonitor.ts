/**
 * Performance monitoring and optimization utilities for mobile devices
 * Features:
 * - Real-time performance metrics
 * - Memory leak detection
 * - FPS monitoring
 * - Battery level monitoring
 * - Network condition detection
 */

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  memoryLimit: number;
  batteryLevel: number;
  isCharging: boolean;
  networkSpeed: string;
  processingTime: number;
  lastGCTime: number;
}

export interface OptimizationSettings {
  maxMemoryUsage: number;
  targetFPS: number;
  maxImageSize: number;
  enableBackgroundProcessing: boolean;
  compressionQuality: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    batteryLevel: 1,
    isCharging: false,
    networkSpeed: 'unknown',
    processingTime: 0,
    lastGCTime: 0
  };
  
  private settings: OptimizationSettings = {
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    targetFPS: 30,
    maxImageSize: 1024,
    enableBackgroundProcessing: true,
    compressionQuality: 0.8
  };
  
  private fpsCounter = 0;
  private lastFPSTime = 0;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSettings();
    this.detectDeviceCapabilities();
  }

  private initializeSettings() {
    // Adjust settings based on device capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      const memory = (performance as any)?.memory?.heapSizeLimit || 0;
      
      if (memory > 1024 * 1024 * 1024) { // High-end device (>1GB)
        this.settings = {
          maxMemoryUsage: 200 * 1024 * 1024, // 200MB
          targetFPS: 60,
          maxImageSize: 2048,
          enableBackgroundProcessing: true,
          compressionQuality: 0.9
        };
      } else if (memory > 512 * 1024 * 1024) { // Mid-range device (512MB-1GB)
        this.settings = {
          maxMemoryUsage: 150 * 1024 * 1024, // 150MB
          targetFPS: 45,
          maxImageSize: 1536,
          enableBackgroundProcessing: true,
          compressionQuality: 0.8
        };
      } else { // Low-end device (<512MB)
        this.settings = {
          maxMemoryUsage: 80 * 1024 * 1024, // 80MB
          targetFPS: 30,
          maxImageSize: 1024,
          enableBackgroundProcessing: false,
          compressionQuality: 0.7
        };
      }
    }
  }

  private detectDeviceCapabilities() {
    // Check for Performance API
    if ('memory' in performance) {
      this.metrics.memoryLimit = (performance as any).memory.jsHeapSizeLimit;
    }

    // Check for Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level;
        this.metrics.isCharging = battery.charging;
      });
    }

    // Check for Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.metrics.networkSpeed = connection.effectiveType || 'unknown';
      }
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor FPS
    this.monitorFPS();
    
    // Monitor other metrics every 2 seconds
    this.monitorInterval = setInterval(() => {
      this.updateMetrics();
      this.checkPerformanceThresholds();
    }, 2000);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private monitorFPS(): void {
    let lastTime = performance.now();
    
    const measureFPS = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      this.fpsCounter++;
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.fps = Math.round((this.fpsCounter * 1000) / (currentTime - lastTime));
        this.fpsCounter = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  private updateMetrics(): void {
    // Update memory usage
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    // Update battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level;
        this.metrics.isCharging = battery.charging;
      });
    }

    // Update processing time
    this.metrics.processingTime = performance.now();
  }

  private checkPerformanceThresholds(): void {
    const warnings: string[] = [];

    // Check memory usage
    if (this.metrics.memoryUsage > this.settings.maxMemoryUsage) {
      warnings.push('High memory usage detected');
      this.optimizeForMemory();
    }

    // Check FPS
    if (this.metrics.fps < this.settings.targetFPS) {
      warnings.push('Low FPS detected');
      this.optimizeForPerformance();
    }

    // Check battery level
    if (this.metrics.batteryLevel < 0.2 && !this.metrics.isCharging) {
      warnings.push('Low battery - reducing quality');
      this.optimizeForBattery();
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('Performance optimizations triggered:', warnings);
    }
  }

  /**
   * Optimize for memory constraints
   */
  private optimizeForMemory(): void {
    this.settings.maxImageSize = Math.min(512, this.settings.maxImageSize);
    this.settings.compressionQuality = 0.6;
    
    // Force garbage collection if available
    if ((window as any).gc) {
      try {
        (window as any).gc();
        this.metrics.lastGCTime = performance.now();
      } catch (e) {
        // GC not available
      }
    }
  }

  /**
   * Optimize for performance constraints
   */
  private optimizeForPerformance(): void {
    this.settings.maxImageSize = Math.min(768, this.settings.maxImageSize);
    this.settings.compressionQuality = 0.7;
    this.settings.enableBackgroundProcessing = false;
  }

  /**
   * Optimize for battery constraints
   */
  private optimizeForBattery(): void {
    this.settings.maxImageSize = Math.min(512, this.settings.maxImageSize);
    this.settings.compressionQuality = 0.5;
    this.settings.enableBackgroundProcessing = false;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.memoryUsage > this.settings.maxMemoryUsage * 0.8) {
      recommendations.push('Reduce image size or enable compression');
    }
    
    if (this.metrics.fps < this.settings.targetFPS * 0.8) {
      recommendations.push('Lower image quality or disable animations');
    }
    
    if (this.metrics.batteryLevel < 0.3) {
      recommendations.push('Enable battery saver mode');
    }
    
    if (this.metrics.networkSpeed === 'slow-2g' || this.metrics.networkSpeed === '2g') {
      recommendations.push('Reduce image quality for slow network');
    }
    
    return recommendations;
  }

  /**
   * Force garbage collection and cleanup
   */
  forceCleanup(): void {
    // Clear any cached resources
    if ((window as any).gc) {
      try {
        (window as any).gc();
        this.metrics.lastGCTime = performance.now();
      } catch (e) {
        // GC not available
      }
    }
  }

  /**
   * Get device performance score (0-100)
   */
  getPerformanceScore(): number {
    let score = 100;
    
    // Deduct points for low FPS
    if (this.metrics.fps < 30) {
      score -= (30 - this.metrics.fps) * 2;
    }
    
    // Deduct points for high memory usage
    const memoryPercentage = (this.metrics.memoryUsage / this.settings.maxMemoryUsage) * 100;
    if (memoryPercentage > 80) {
      score -= (memoryPercentage - 80) * 2;
    }
    
    // Deduct points for low battery
    if (this.metrics.batteryLevel < 0.5) {
      score -= (0.5 - this.metrics.batteryLevel) * 20;
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Update optimization settings
   */
  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring
if (typeof window !== 'undefined') {
  // Start monitoring after initial load
  window.addEventListener('load', () => {
    performanceMonitor.startMonitoring();
  });
  
  // Stop monitoring on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.stopMonitoring();
  });
}