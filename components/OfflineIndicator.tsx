import React, { useState, useEffect } from 'react';
import { WifiOffIcon, WifiIcon, RefreshCwIcon } from './icons';

interface OfflineIndicatorProps {
  onRetry?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      setIsRetrying(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show banner if currently offline
    if (!navigator.onLine) {
      setShowOfflineBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Simulate network check
    try {
      const response = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
      if (response.ok) {
        setIsOnline(true);
        setShowOfflineBanner(false);
        setIsRetrying(false);
      } else {
        setIsRetrying(false);
      }
    } catch (error) {
      console.log('Network still unavailable');
      setIsRetrying(false);
    }
    
    onRetry?.();
  };

  // Don't show anything if online
  if (isOnline) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-orange-600 text-white">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <WifiOffIcon className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">You're Offline</p>
                <p className="text-xs text-red-100">Some features may be limited</p>
              </div>
            </div>
            
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Checking...' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Offline Status (when banner is dismissed but still offline) */}
      {!showOfflineBanner && !isOnline && (
        <div className="fixed top-4 right-4 z-40">
          <div className="bg-red-600 text-white rounded-full p-2 shadow-lg animate-pulse">
            <WifiOffIcon className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Online Status Indicator */}
      {isOnline && (
        <div className="fixed top-4 right-4 z-40 opacity-0 animate-fade-in">
          <div className="bg-green-600 text-white rounded-full p-2 shadow-lg">
            <WifiIcon className="w-5 h-5" />
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;