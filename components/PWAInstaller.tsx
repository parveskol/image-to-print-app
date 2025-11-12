import React, { useState, useEffect } from 'react';
import { DownloadIcon, XIcon, SmartphoneIcon, CheckIcon } from './icons';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallerProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const PWAInstaller: React.FC<PWAInstallerProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    const isAlreadyInstalled = localStorage.getItem('pwa-installed') === 'true';
    const lastPromptTime = localStorage.getItem('pwa-last-prompt');
    const shouldShowPrompt = !hasBeenDismissed &&
      !isAlreadyInstalled &&
      !isStandalone &&
      !isInWebAppiOS &&
      (!lastPromptTime || (Date.now() - parseInt(lastPromptTime)) > 7 * 24 * 60 * 60 * 1000); // 7 days

    if (shouldShowPrompt) {
      setShowInstallBanner(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      console.log('PWA: Before install prompt available');
    };

    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setInstallStatus('success');
      setShowInstallBanner(false);
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-last-prompt');
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    setInstallStatus('installing');

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        localStorage.removeItem('pwa-install-dismissed');
        localStorage.setItem('pwa-installed', 'true');
        onInstall?.();
      } else {
        console.log('PWA: User dismissed the install prompt');
        localStorage.setItem('pwa-install-dismissed', 'true');
        localStorage.setItem('pwa-last-prompt', Date.now().toString());
        onDismiss?.();
      }

      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (error) {
      console.error('PWA: Install prompt error:', error);
      setInstallStatus('error');
      setTimeout(() => setInstallStatus('idle'), 3000);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-last-prompt', Date.now().toString());
    onDismiss?.();
  };

  const isInstallable = deferredPrompt !== null;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // Don't show if already installed or should be hidden
  if (!showInstallBanner || isStandalone || (!isInstallable && !isAndroid && !isIOS)) {
    return null;
  }

  return (
    <>
      {/* Installation Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl border border-blue-500/20 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <SmartphoneIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm mb-1">
                  Install Image to Print Pro
                </h3>
                <p className="text-blue-100 text-xs leading-relaxed mb-3">
                  {isInstallable 
                    ? "Get the full app experience with offline support and home screen access"
                    : isAndroid
                    ? "Add to home screen for quick access and better performance"
                    : "Add to your home screen for a native app experience"
                  }
                </p>
                
                <div className="flex items-center gap-2">
                  {isInstallable ? (
                    <button
                      onClick={handleInstallClick}
                      disabled={isInstalling}
                      className="flex items-center gap-1.5 bg-white text-blue-600 font-bold py-2 px-3 rounded-lg text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                    >
                      {isInstalling ? (
                        <>
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-3 h-3" />
                          Install App
                        </>
                      )}
                    </button>
                  ) : isAndroid ? (
                    <div className="text-xs text-blue-100">
                      <p className="font-medium">For Android:</p>
                      <p>Menu → "Add to Home screen"</p>
                    </div>
                  ) : isIOS ? (
                    <div className="text-xs text-blue-100">
                      <p className="font-medium">For iOS:</p>
                      <p>Share → "Add to Home Screen"</p>
                    </div>
                  ) : null}
                  
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 text-blue-200 hover:text-white transition-colors"
                    aria-label="Dismiss"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Feedback */}
      {installStatus !== 'idle' && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className={`rounded-lg px-4 py-2 text-white text-sm font-medium shadow-lg ${
            installStatus === 'success' ? 'bg-green-600' : 
            installStatus === 'installing' ? 'bg-blue-600' : 'bg-red-600'
          }`}>
            <div className="flex items-center gap-2">
              {installStatus === 'success' && <CheckIcon className="w-4 h-4" />}
              {installStatus === 'installing' && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {installStatus === 'success' && 'App installed successfully!'}
              {installStatus === 'installing' && 'Installing app...'}
              {installStatus === 'error' && 'Installation failed. Please try again.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstaller;