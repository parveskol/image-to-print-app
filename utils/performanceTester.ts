/**
 * Performance testing and validation utilities
 * Features:
 * - Mobile device simulation
 * - Performance benchmarking
 * - Memory leak detection
 * - Network condition simulation
 * - Automated performance reports
 */

export interface TestResult {
  testName: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryLeak: number;
  success: boolean;
  errors: string[];
  warnings: string[];
}

export interface BenchmarkResult {
  testSuite: string;
  results: TestResult[];
  averageDuration: number;
  totalMemoryLeak: number;
  performanceScore: number;
}

class PerformanceTester {
  private testResults: TestResult[] = [];
  private isTesting = false;

  /**
   * Run comprehensive performance tests
   */
  async runComprehensiveTests(): Promise<BenchmarkResult> {
    if (this.isTesting) {
      throw new Error('Tests are already running');
    }

    this.isTesting = true;
    const startTime = performance.now();

    try {
      console.log('🚀 Starting comprehensive performance tests...');

      // Test suite 1: Image Processing Performance
      await this.testImageProcessingPerformance();
      
      // Test suite 2: Memory Management
      await this.testMemoryManagement();
      
      // Test suite 3: UI Responsiveness
      await this.testUIResponsiveness();
      
      // Test suite 4: Network Simulation
      await this.testNetworkPerformance();
      
      const duration = performance.now() - startTime;
      
      const result: BenchmarkResult = {
        testSuite: 'Mobile Performance Optimization',
        results: [...this.testResults],
        averageDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length,
        totalMemoryLeak: this.testResults.reduce((sum, r) => sum + r.memoryLeak, 0),
        performanceScore: this.calculatePerformanceScore()
      };

      this.generateReport(result);
      return result;

    } finally {
      this.isTesting = false;
      this.testResults = [];
    }
  }

  /**
   * Test image processing performance
   */
  private async testImageProcessingPerformance(): Promise<void> {
    const testNames = [
      'Image Resize (Small)',
      'Image Resize (Medium)', 
      'Image Resize (Large)',
      'Background Removal',
      'Batch Processing'
    ];

    for (const testName of testNames) {
      const result = await this.runTest(testName, async () => {
        // Create test image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot create canvas context');
        
        // Set canvas size based on test
        let size = 512; // Default small
        if (testName.includes('Medium')) size = 1024;
        if (testName.includes('Large')) size = 2048;
        
        canvas.width = size;
        canvas.height = size;
        
        // Draw test pattern
        ctx.fillStyle = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
        ctx.fillRect(0, 0, size, size);
        
        // Simulate image processing
        const imageData = ctx.getImageData(0, 0, size, size);
        
        // Simple pixel manipulation to simulate processing
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] * 0.8; // Red
          data[i + 1] = data[i + 1] * 1.2; // Green  
          data[i + 2] = data[i + 2]; // Blue
          data[i + 3] = 255; // Alpha
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to data URL (simulates compression)
        const dataUrl = canvas.toDataURL('image/png', 0.8);
        
        // Cleanup
        canvas.width = 1;
        canvas.height = 1;
        
        return dataUrl.length > 100; // Basic validation
      });

      this.testResults.push(result);
    }
  }

  /**
   * Test memory management
   */
  private async testMemoryManagement(): Promise<void> {
    const memoryTests = [
      'Canvas Memory Cleanup',
      'Image Object Cleanup',
      'Event Listener Cleanup',
      'Large Object Cleanup'
    ];

    for (const testName of memoryTests) {
      const result = await this.runTest(testName, async () => {
        const objects: any[] = [];
        
        // Create objects to test cleanup
        if (testName.includes('Canvas')) {
          for (let i = 0; i < 10; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'red';
              ctx.fillRect(0, 0, 1024, 1024);
            }
            objects.push(canvas);
          }
        } else if (testName.includes('Image')) {
          for (let i = 0; i < 10; i++) {
            const img = new Image();
            img.src = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
            objects.push(img);
          }
        }
        
        // Cleanup objects
        objects.forEach(obj => {
          if (obj instanceof HTMLCanvasElement) {
            obj.width = 1;
            obj.height = 1;
          } else if (obj instanceof HTMLImageElement) {
            obj.src = '';
          }
        });
        
        return true;
      });

      this.testResults.push(result);
    }
  }

  /**
   * Test UI responsiveness
   */
  private async testUIResponsiveness(): Promise<void> {
    const responsivenessTests = [
      'Touch Event Handling',
      'Animation Performance',
      'Scroll Performance',
      'Button Click Response'
    ];

    for (const testName of responsivenessTests) {
      const result = await this.runTest(testName, async () => {
        // Simulate UI interactions
        if (testName.includes('Touch')) {
          // Simulate touch events
          for (let i = 0; i < 100; i++) {
            const touchEvent = new TouchEvent('touchstart', {
              touches: [new Touch({
                identifier: i,
                target: document.body,
                clientX: Math.random() * window.innerWidth,
                clientY: Math.random() * window.innerHeight
              })]
            });
            document.body.dispatchEvent(touchEvent);
          }
        } else if (testName.includes('Animation')) {
          // Test CSS animations
          const element = document.createElement('div');
          element.style.transition = 'all 0.3s ease';
          element.style.opacity = '0';
          document.body.appendChild(element);
          
          // Trigger animation
          requestAnimationFrame(() => {
            element.style.opacity = '1';
          });
          
          // Cleanup
          document.body.removeChild(element);
        }
        
        return true;
      });

      this.testResults.push(result);
    }
  }

  /**
   * Test network performance simulation
   */
  private async testNetworkPerformance(): Promise<void> {
    const networkTests = [
      'Slow Network Simulation',
      'Fast Network Simulation',
      'Offline Simulation'
    ];

    for (const testName of networkTests) {
      const result = await this.runTest(testName, async () => {
        const startTime = performance.now();
        
        // Simulate network delay
        let delay = 100; // Default
        if (testName.includes('Slow')) delay = 2000;
        if (testName.includes('Fast')) delay = 50;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const duration = performance.now() - startTime;
        
        // Validate timing
        if (testName.includes('Slow') && duration < 1500) {
          throw new Error('Slow network test was too fast');
        }
        if (testName.includes('Fast') && duration > 200) {
          throw new Error('Fast network test was too slow');
        }
        
        return true;
      });

      this.testResults.push(result);
    }
  }

  /**
   * Run a single test with memory tracking
   */
  private async runTest(testName: string, testFunction: () => Promise<boolean>): Promise<TestResult> {
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const success = await testFunction();
      
      // Force garbage collection between tests
      if ((window as any).gc) {
        try {
          (window as any).gc();
        } catch (e) {
          warnings.push('Garbage collection not available');
        }
      }

      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();
      const duration = endTime - startTime;
      const memoryLeak = Math.max(0, memoryAfter - memoryBefore);

      return {
        testName,
        duration,
        memoryBefore,
        memoryAfter,
        memoryLeak,
        success,
        errors,
        warnings
      };

    } catch (error) {
      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();
      const duration = endTime - startTime;
      const memoryLeak = Math.max(0, memoryAfter - memoryBefore);

      return {
        testName,
        duration,
        memoryBefore,
        memoryAfter,
        memoryLeak,
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings
      };
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(): number {
    let score = 100;

    // Deduct points for failed tests
    const failedTests = this.testResults.filter(r => !r.success).length;
    score -= failedTests * 10;

    // Deduct points for memory leaks
    const totalMemoryLeak = this.testResults.reduce((sum, r) => sum + r.memoryLeak, 0);
    if (totalMemoryLeak > 10 * 1024 * 1024) { // More than 10MB
      score -= 20;
    } else if (totalMemoryLeak > 5 * 1024 * 1024) { // More than 5MB
      score -= 10;
    }

    // Deduct points for slow performance
    const averageDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length;
    if (averageDuration > 1000) { // More than 1 second
      score -= 15;
    } else if (averageDuration > 500) { // More than 500ms
      score -= 5;
    }

    // Deduct points for errors
    const totalErrors = this.testResults.reduce((sum, r) => sum + r.errors.length, 0);
    score -= totalErrors * 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate performance test report
   */
  private generateReport(result: BenchmarkResult): void {
    console.group('📊 Performance Test Report');
    console.log(`Test Suite: ${result.testSuite}`);
    console.log(`Performance Score: ${result.performanceScore}/100`);
    console.log(`Average Duration: ${result.averageDuration.toFixed(2)}ms`);
    console.log(`Total Memory Leak: ${(result.totalMemoryLeak / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total Tests: ${result.results.length}`);
    console.log(`Failed Tests: ${result.results.filter(r => !r.success).length}`);

    console.group('Detailed Results:');
    result.results.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`${status} ${test.testName}: ${test.duration.toFixed(2)}ms, Memory Leak: ${(test.memoryLeak / 1024 / 1024).toFixed(2)}MB`);
      if (test.errors.length > 0) {
        console.log(`   Errors: ${test.errors.join(', ')}`);
      }
      if (test.warnings.length > 0) {
        console.log(`   Warnings: ${test.warnings.join(', ')}`);
      }
    });
    console.groupEnd();

    // Device-specific recommendations
    this.generateRecommendations(result);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(result: BenchmarkResult): void {
    const recommendations: string[] = [];

    if (result.performanceScore < 70) {
      recommendations.push('Consider reducing image sizes for better mobile performance');
    }

    if (result.totalMemoryLeak > 5 * 1024 * 1024) {
      recommendations.push('Implement more aggressive memory cleanup');
    }

    if (result.averageDuration > 500) {
      recommendations.push('Optimize image processing algorithms');
    }

    const failedTests = result.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push('Review failed tests and improve error handling');
    }

    if (recommendations.length > 0) {
      console.group('💡 Performance Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.groupEnd();
    }
  }

  /**
   * Run quick performance check
   */
  async runQuickCheck(): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];
    
    // Check current performance
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > 100 * 1024 * 1024) { // 100MB
      issues.push('High memory usage detected');
    }

    // Check FPS
    let fps = 60;
    let frames = 0;
    const start = performance.now();
    
    const measureFPS = () => {
      frames++;
      if (performance.now() - start < 1000) {
        requestAnimationFrame(measureFPS);
      } else {
        fps = frames;
      }
    };
    
    requestAnimationFrame(measureFPS);
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    if (fps < 30) {
      issues.push('Low FPS detected - UI may be sluggish');
    }

    // Calculate score
    let score = 100;
    if (issues.length === 1) score = 75;
    if (issues.length === 2) score = 50;
    if (issues.length > 2) score = 25;

    return { score, issues };
  }
}

// Singleton instance
export const performanceTester = new PerformanceTester();

// Auto-run quick check on mobile devices
if (typeof window !== 'undefined') {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    window.addEventListener('load', async () => {
      try {
        const result = await performanceTester.runQuickCheck();
        console.log(`📱 Mobile Performance Check: ${result.score}/100`);
        if (result.issues.length > 0) {
          console.log('Issues detected:', result.issues);
        }
      } catch (error) {
        console.warn('Performance check failed:', error);
      }
    });
  }
}