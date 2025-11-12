/**
 * Memory management and cleanup utilities for mobile optimization
 * Features:
 * - Automatic resource cleanup
 * - Memory leak detection
 * - Canvas and image cleanup
 * - Event listener management
 * - Garbage collection triggers
 */

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface ResourceTracker {
  id: string;
  type: 'canvas' | 'image' | 'video' | 'audio' | 'worker' | 'listener';
  element: any;
  created: number;
  lastAccessed: number;
}

class MemoryManager {
  private trackedResources: Map<string, ResourceTracker> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private maxHistoryLength = 100;
  private isMonitoring = false;

  constructor() {
    this.initializeCleanup();
    this.setupMemoryMonitoring();
  }

  /**
   * Initialize automatic cleanup system
   */
  private initializeCleanup(): void {
    // Run cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30000);

    // Cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performLightCleanup();
      } else {
        this.performFullCleanup();
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.performFullCleanup();
      this.stopMonitoring();
    });
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      this.startMonitoring();
    }
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor memory every 10 seconds
    const monitorInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(monitorInterval);
        return;
      }
      
      this.recordMemoryStats();
      this.checkMemoryThresholds();
    }, 10000);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Track a resource for automatic cleanup
   */
  trackResource(
    type: ResourceTracker['type'],
    element: any,
    id?: string
  ): string {
    const resourceId = id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.trackedResources.set(resourceId, {
      id: resourceId,
      type,
      element,
      created: Date.now(),
      lastAccessed: Date.now()
    });

    return resourceId;
  }

  /**
   * Untrack a resource
   */
  untrackResource(id: string): boolean {
    const resource = this.trackedResources.get(id);
    if (resource) {
      this.cleanupResource(resource);
      this.trackedResources.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Cleanup a specific resource
   */
  private cleanupResource(resource: ResourceTracker): void {
    try {
      switch (resource.type) {
        case 'canvas':
          if (resource.element && typeof resource.element.toDataURL === 'function') {
            // Clear canvas content
            const ctx = resource.element.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, resource.element.width, resource.element.height);
            }
            resource.element.width = 1;
            resource.element.height = 1;
          }
          break;

        case 'image':
          if (resource.element) {
            resource.element.src = '';
            resource.element.onload = null;
            resource.element.onerror = null;
            resource.element.onabort = null;
          }
          break;

        case 'video':
        case 'audio':
          if (resource.element) {
            resource.element.pause();
            resource.element.src = '';
            resource.element.load();
          }
          break;

        case 'worker':
          if (resource.element && typeof resource.element.terminate === 'function') {
            resource.element.terminate();
          }
          break;

        case 'listener':
          // Listeners are cleaned up in performCleanup
          break;
      }
    } catch (error) {
      console.warn('Failed to cleanup resource:', resource.id, error);
    }
  }

  /**
   * Perform light cleanup (when page is hidden)
   */
  private performLightCleanup(): void {
    // Cleanup old canvas elements
    this.trackedResources.forEach((resource, id) => {
      if (resource.type === 'canvas' && Date.now() - resource.lastAccessed > 60000) {
        this.cleanupResource(resource);
        this.trackedResources.delete(id);
      }
    });

    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  /**
   * Perform full cleanup
   */
  private performFullCleanup(): void {
    const now = Date.now();
    const cleanupThreshold = 300000; // 5 minutes

    this.trackedResources.forEach((resource, id) => {
      if (now - resource.lastAccessed > cleanupThreshold) {
        this.cleanupResource(resource);
        this.trackedResources.delete(id);
      }
    });

    // Cleanup event listeners
    this.cleanupEventListeners();

    // Force garbage collection
    this.forceGarbageCollection();
  }

  /**
   * Perform cleanup based on resource age and type
   */
  private performCleanup(): void {
    const now = Date.now();
    
    // Cleanup strategy based on resource type and age
    this.trackedResources.forEach((resource, id) => {
      const age = now - resource.created;
      
      switch (resource.type) {
        case 'canvas':
          if (age > 600000) { // 10 minutes
            this.cleanupResource(resource);
            this.trackedResources.delete(id);
          }
          break;
          
        case 'image':
          if (age > 300000) { // 5 minutes
            this.cleanupResource(resource);
            this.trackedResources.delete(id);
          }
          break;
          
        default:
          if (age > 1800000) { // 30 minutes
            this.cleanupResource(resource);
            this.trackedResources.delete(id);
          }
      }
    });

    // Cleanup based on memory pressure
    if (this.memoryHistory.length > 0) {
      const latest = this.memoryHistory[this.memoryHistory.length - 1];
      const memoryUsage = latest.usedJSHeapSize / latest.jsHeapSizeLimit;
      
      if (memoryUsage > 0.8) { // 80% memory usage
        this.performAggressiveCleanup();
      }
    }
  }

  /**
   * Perform aggressive cleanup under memory pressure
   */
  private performAggressiveCleanup(): void {
    const now = Date.now();
    
    this.trackedResources.forEach((resource, id) => {
      // Cleanup everything older than 1 minute under memory pressure
      if (now - resource.created > 60000) {
        this.cleanupResource(resource);
        this.trackedResources.delete(id);
      }
    });

    this.forceGarbageCollection();
  }

  /**
   * Cleanup event listeners
   */
  private cleanupEventListeners(): void {
    // This is a basic implementation
    // In a real app, you'd want to track listeners more specifically
    const trackedListeners: ResourceTracker[] = [];
    this.trackedResources.forEach(resource => {
      if (resource.type === 'listener') {
        trackedListeners.push(resource);
      }
    });
    
    trackedListeners.forEach(resource => {
      this.trackedResources.delete(resource.id);
    });
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if ((window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        // GC might not be available or enabled
      }
    }
  }

  /**
   * Record current memory statistics
   */
  private recordMemoryStats(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as any).memory;
    const stats: MemoryStats = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };

    this.memoryHistory.push(stats);
    
    // Keep only last 100 entries
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }
  }

  /**
   * Check memory thresholds and trigger cleanup if needed
   */
  private checkMemoryThresholds(): void {
    if (this.memoryHistory.length === 0) return;

    const latest = this.memoryHistory[this.memoryHistory.length - 1];
    const memoryUsage = latest.usedJSHeapSize / latest.jsHeapSizeLimit;

    // Log memory usage
    if (memoryUsage > 0.7) {
      console.warn(`High memory usage detected: ${(memoryUsage * 100).toFixed(1)}%`);
    }

    // Trigger cleanup based on memory usage
    if (memoryUsage > 0.9) {
      this.performAggressiveCleanup();
    } else if (memoryUsage > 0.75) {
      this.performFullCleanup();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    if (this.memoryHistory.length === 0) return null;
    return this.memoryHistory[this.memoryHistory.length - 1];
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage(): number {
    const stats = this.getMemoryStats();
    if (!stats) return 0;
    return (stats.usedJSHeapSize / stats.jsHeapSizeLimit) * 100;
  }

  /**
   * Get tracked resources count
   */
  getTrackedResourcesCount(): number {
    return this.trackedResources.size;
  }

  /**
   * Get memory history
   */
  getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * Clear all tracked resources
   */
  clearAllResources(): void {
    this.trackedResources.forEach(resource => {
      this.cleanupResource(resource);
    });
    this.trackedResources.clear();
  }

  /**
   * Destroy the memory manager
   */
  destroy(): void {
    this.stopMonitoring();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clearAllResources();
    this.memoryHistory = [];
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

// Auto-destroy on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.destroy();
  });
}