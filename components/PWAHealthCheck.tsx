// Performance monitoring component for mobile devices
import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  memoryUsage?: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
}

const PWAHealthCheck: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      const newMetrics: PerformanceMetrics = {};

      // Memory information (Chrome/Edge)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        newMetrics.memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        newMetrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;
        newMetrics.totalJSHeapSize = memory.totalJSHeapSize;
        newMetrics.usedJSHeapSize = memory.usedJSHeapSize;
      }

      // Device capabilities
      newMetrics.deviceMemory = (navigator as any).deviceMemory;
      newMetrics.hardwareConcurrency = navigator.hardwareConcurrency;

      // Network information
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        newMetrics.connectionType = connection?.type;
        newMetrics.effectiveType = connection?.effectiveType;
        newMetrics.downlink = connection?.downlink;
      }

      setMetrics(newMetrics);
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    // Toggle visibility with triple-tap on header (mobile debugging)
    let tapCount = 0;
    let lastTapTime = 0;

    const handleTripleTap = () => {
      const now = Date.now();
      if (now - lastTapTime < 500) {
        tapCount++;
        if (tapCount === 3) {
          setIsVisible(prev => !prev);
          tapCount = 0;
        }
      } else {
        tapCount = 1;
      }
      lastTapTime = now;
    };

    const header = document.querySelector('header');
    if (header) {
      header.addEventListener('touchend', handleTripleTap);
    }

    return () => {
      clearInterval(interval);
      if (header) {
        header.removeEventListener('touchend', handleTripleTap);
      }
    };
  }, []);

  if (!isVisible) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMemoryStatus = () => {
    if (!metrics.memoryUsage) return 'Unknown';
    if (metrics.memoryUsage > 0.8) return 'Critical';
    if (metrics.memoryUsage > 0.6) return 'High';
    if (metrics.memoryUsage > 0.4) return 'Moderate';
    return 'Low';
  };

  const getMemoryStatusColor = () => {
    const status = getMemoryStatus();
    switch (status) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Moderate': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg max-w-xs z-50 font-mono">
      <div className="font-bold mb-2 text-yellow-400">Performance Monitor</div>

      {metrics.memoryUsage !== undefined && (
        <div className="mb-2">
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={getMemoryStatusColor()}>
              {getMemoryStatus()} ({(metrics.memoryUsage * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {formatBytes(metrics.usedJSHeapSize || 0)} / {formatBytes(metrics.totalJSHeapSize || 0)}
          </div>
        </div>
      )}

      <div className="mb-2">
        <div>Device: {metrics.deviceMemory || '?'}GB RAM</div>
        <div>Cores: {metrics.hardwareConcurrency || '?'}</div>
      </div>

      {(metrics.effectiveType || metrics.connectionType) && (
        <div className="mb-2">
          <div>Network: {metrics.effectiveType || 'Unknown'}</div>
          {metrics.downlink && <div>Speed: {metrics.downlink} Mbps</div>}
        </div>
      )}

      <button
        onClick={() => setIsVisible(false)}
        className="mt-2 text-xs text-gray-400 hover:text-white"
      >
        [Hide]
      </button>
    </div>
  );
};

export default PWAHealthCheck;