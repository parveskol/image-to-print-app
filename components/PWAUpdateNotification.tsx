import React, { useState, useEffect } from "react";
import { UpdateIcon, DownloadIcon, XIcon } from "./icons";

interface UpdateNotificationProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

const PWAUpdateNotification: React.FC<UpdateNotificationProps> = ({
  onUpdate,
  onDismiss,
}) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check for service worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New update is available
                setUpdateAvailable(true);
                setShowUpdateBanner(true);
              }
            });
          }
        });

        // Check if update is waiting
        if (registration.waiting) {
          setUpdateAvailable(true);
          setShowUpdateBanner(true);
        }
      });

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "UPDATE_AVAILABLE") {
          setUpdateAvailable(true);
          setShowUpdateBanner(true);
        }
      });
    }

    // Check for app version updates
    const checkForAppUpdate = () => {
      const currentVersion = "1.0.0"; // This should come from your app config
      const storedVersion = localStorage.getItem("app-version");

      if (storedVersion && storedVersion !== currentVersion) {
        setUpdateAvailable(true);
        setShowUpdateBanner(true);
        localStorage.setItem("app-version", currentVersion);
      }
    };

    // Check immediately and on app focus
    checkForAppUpdate();
    window.addEventListener("focus", checkForAppUpdate);

    return () => {
      window.removeEventListener("focus", checkForAppUpdate);
    };
  }, []);

  const handleUpdateClick = async () => {
    setIsUpdating(true);

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;

        if (registration.waiting) {
          // Send message to skip waiting
          registration.waiting.postMessage({ type: "SKIP_WAITING" });

          // Wait for the controlling service worker to change
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });
        }
      }

      onUpdate?.();
    } catch (error) {
      console.error("PWA Update failed:", error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
    onDismiss?.();
  };

  if (!showUpdateBanner || !updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-2xl border border-green-500/20 p-4 backdrop-blur-sm android-notification">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <UpdateIcon className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm mb-1">
              App Update Available
            </h3>
            <p className="text-green-100 text-xs leading-relaxed mb-3">
              A new version of Image to Print Pro is ready with improved
              features and bug fixes.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdateClick}
                disabled={isUpdating}
                className="flex items-center gap-1.5 bg-white text-green-600 font-bold py-2 px-3 rounded-lg text-xs hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                {isUpdating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="w-3 h-3" />
                    Update Now
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className="p-1.5 text-green-200 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;
