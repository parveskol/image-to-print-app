/**
 * PWA Utilities
 * Handles PWA installation, permissions, and device capabilities
 */

// Types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWADisplayMode {
  isStandalone: boolean;
  isFullscreen: boolean;
  isMinimalUI: boolean;
  isBrowser: boolean;
}

interface DeviceCapabilities {
  hasCamera: boolean;
  hasNotifications: boolean;
  hasBackgroundSync: boolean;
  hasPeriodicSync: boolean;
  hasShareAPI: boolean;
  hasFileSystemAccess: boolean;
  isOnline: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
}

// PWA Installation
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const initPWAInstallPrompt = (): void => {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    console.log("[PWA] Install prompt ready");

    // Dispatch custom event for UI to show install button
    window.dispatchEvent(new CustomEvent("pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    console.log("[PWA] App installed");
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
};

export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.warn("[PWA] Install prompt not available");
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User ${outcome} the install prompt`);

    deferredPrompt = null;
    return outcome === "accepted";
  } catch (error) {
    console.error("[PWA] Install prompt error:", error);
    return false;
  }
};

export const canInstallPWA = (): boolean => {
  return deferredPrompt !== null;
};

// Display Mode Detection
export const getPWADisplayMode = (): PWADisplayMode => {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  const isFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const isMinimalUI = window.matchMedia("(display-mode: minimal-ui)").matches;
  const isBrowser = window.matchMedia("(display-mode: browser)").matches;

  return {
    isStandalone,
    isFullscreen,
    isMinimalUI,
    isBrowser,
  };
};

export const isPWAInstalled = (): boolean => {
  const displayMode = getPWADisplayMode();
  return displayMode.isStandalone || displayMode.isFullscreen;
};

// Device Capabilities
export const getDeviceCapabilities = async (): Promise<DeviceCapabilities> => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);

  let hasCamera = false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    hasCamera = devices.some((device) => device.kind === "videoinput");
  } catch (error) {
    console.warn("[PWA] Camera check failed:", error);
  }

  const hasNotifications = "Notification" in window;
  const hasBackgroundSync = "sync" in ServiceWorkerRegistration.prototype;
  const hasPeriodicSync = "periodicSync" in ServiceWorkerRegistration.prototype;
  const hasShareAPI = "share" in navigator;
  const hasFileSystemAccess = "showOpenFilePicker" in window;
  const isOnline = navigator.onLine;
  const isPWA = isPWAInstalled();

  return {
    hasCamera,
    hasNotifications,
    hasBackgroundSync,
    hasPeriodicSync,
    hasShareAPI,
    hasFileSystemAccess,
    isOnline,
    isMobile,
    isIOS,
    isAndroid,
    isPWA,
  };
};

// Camera Permissions
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    // Stop the stream immediately as we only need permission
    stream.getTracks().forEach((track) => track.stop());

    console.log("[PWA] Camera permission granted");
    return true;
  } catch (error: any) {
    console.error("[PWA] Camera permission denied:", error);
    return false;
  }
};

export const getCameraPermissionStatus = async (): Promise<PermissionState> => {
  try {
    const permission = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    return permission.state;
  } catch (error) {
    console.warn("[PWA] Camera permission status unavailable:", error);
    return "prompt";
  }
};

// Notification Permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("[PWA] Notifications not supported");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("[PWA] Notification permission:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("[PWA] Notification permission error:", error);
    return false;
  }
};

export const getNotificationPermissionStatus = (): NotificationPermission => {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
};

export const showNotification = async (
  title: string,
  options?: NotificationOptions,
): Promise<void> => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn("[PWA] Notifications not available");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      ...(options as any),
    });
  } catch (error) {
    console.error("[PWA] Show notification error:", error);
  }
};

// Background Sync
export const registerBackgroundSync = async (tag: string): Promise<boolean> => {
  if (
    !("serviceWorker" in navigator) ||
    !("sync" in ServiceWorkerRegistration.prototype)
  ) {
    console.warn("[PWA] Background sync not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log("[PWA] Background sync registered:", tag);
    return true;
  } catch (error) {
    console.error("[PWA] Background sync registration failed:", error);
    return false;
  }
};

// Periodic Background Sync
export const registerPeriodicSync = async (
  tag: string,
  minInterval: number = 24 * 60 * 60 * 1000, // 24 hours
): Promise<boolean> => {
  if (
    !("serviceWorker" in navigator) ||
    !("periodicSync" in ServiceWorkerRegistration.prototype)
  ) {
    console.warn("[PWA] Periodic sync not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).periodicSync.register(tag, {
      minInterval,
    });
    console.log("[PWA] Periodic sync registered:", tag);
    return true;
  } catch (error) {
    console.error("[PWA] Periodic sync registration failed:", error);
    return false;
  }
};

// Share API
export const canShare = (data?: ShareData): boolean => {
  if (!("share" in navigator)) {
    return false;
  }

  if (data && "canShare" in navigator) {
    return (navigator as any).canShare(data);
  }

  return true;
};

export const shareContent = async (data: ShareData): Promise<boolean> => {
  if (!canShare(data)) {
    console.warn("[PWA] Share API not available");
    return false;
  }

  try {
    await navigator.share(data);
    console.log("[PWA] Content shared successfully");
    return true;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("[PWA] Share cancelled by user");
    } else {
      console.error("[PWA] Share error:", error);
    }
    return false;
  }
};

export const shareImage = async (
  blob: Blob,
  filename: string,
  title?: string,
): Promise<boolean> => {
  try {
    const file = new File([blob], filename, { type: blob.type });
    const shareData: ShareData = {
      files: [file],
      title: title || "Image to Print",
      text: "Check out this image!",
    };

    if (canShare(shareData)) {
      return await shareContent(shareData);
    } else {
      console.warn("[PWA] Cannot share files");
      return false;
    }
  } catch (error) {
    console.error("[PWA] Share image error:", error);
    return false;
  }
};

// Network Status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onNetworkChange = (
  callback: (isOnline: boolean) => void,
): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};

// Service Worker Utilities
export const updateServiceWorker = async (): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log("[PWA] Service worker update checked");
    return true;
  } catch (error) {
    console.error("[PWA] Service worker update error:", error);
    return false;
  }
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log("[PWA] Service worker unregistered:", success);
      return success;
    }
    return false;
  } catch (error) {
    console.error("[PWA] Service worker unregister error:", error);
    return false;
  }
};

export const getServiceWorkerStatus = async (): Promise<{
  isRegistered: boolean;
  isActive: boolean;
  isWaiting: boolean;
}> => {
  if (!("serviceWorker" in navigator)) {
    return {
      isRegistered: false,
      isActive: false,
      isWaiting: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      isRegistered: !!registration,
      isActive: !!registration?.active,
      isWaiting: !!registration?.waiting,
    };
  } catch (error) {
    console.error("[PWA] Service worker status error:", error);
    return {
      isRegistered: false,
      isActive: false,
      isWaiting: false,
    };
  }
};

// Wake Lock API (keep screen on during processing)
let wakeLock: any = null;

export const requestWakeLock = async (): Promise<boolean> => {
  if (!("wakeLock" in navigator)) {
    console.warn("[PWA] Wake Lock API not supported");
    return false;
  }

  try {
    wakeLock = await (navigator as any).wakeLock.request("screen");
    console.log("[PWA] Wake lock acquired");

    wakeLock.addEventListener("release", () => {
      console.log("[PWA] Wake lock released");
    });

    return true;
  } catch (error) {
    console.error("[PWA] Wake lock error:", error);
    return false;
  }
};

export const releaseWakeLock = async (): Promise<void> => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (error) {
      console.error("[PWA] Wake lock release error:", error);
    }
  }
};

// Storage Estimation
export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
  usageInMB: number;
  quotaInMB: number;
  percentUsed: number;
} | null> => {
  if (!("storage" in navigator && "estimate" in navigator.storage)) {
    console.warn("[PWA] Storage estimation not supported");
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    return {
      usage,
      quota,
      usageInMB: usage / (1024 * 1024),
      quotaInMB: quota / (1024 * 1024),
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  } catch (error) {
    console.error("[PWA] Storage estimation error:", error);
    return null;
  }
};

// Persist Storage
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!("storage" in navigator && "persist" in navigator.storage)) {
    console.warn("[PWA] Persistent storage not supported");
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      console.log("[PWA] Storage already persisted");
      return true;
    }

    const result = await navigator.storage.persist();
    console.log("[PWA] Storage persistence:", result);
    return result;
  } catch (error) {
    console.error("[PWA] Persistent storage error:", error);
    return false;
  }
};

// Fullscreen API
export const requestFullscreen = async (
  element: HTMLElement = document.documentElement,
): Promise<boolean> => {
  if (!document.fullscreenEnabled) {
    console.warn("[PWA] Fullscreen not supported");
    return false;
  }

  try {
    await element.requestFullscreen();
    console.log("[PWA] Fullscreen activated");
    return true;
  } catch (error) {
    console.error("[PWA] Fullscreen error:", error);
    return false;
  }
};

export const exitFullscreen = async (): Promise<boolean> => {
  if (!document.fullscreenElement) {
    return false;
  }

  try {
    await document.exitFullscreen();
    console.log("[PWA] Fullscreen exited");
    return true;
  } catch (error) {
    console.error("[PWA] Exit fullscreen error:", error);
    return false;
  }
};

// Initialize all PWA features
export const initPWA = async (): Promise<void> => {
  console.log("[PWA] Initializing PWA features...");

  // Initialize install prompt
  initPWAInstallPrompt();

  // Check device capabilities
  const capabilities = await getDeviceCapabilities();
  console.log("[PWA] Device capabilities:", capabilities);

  // Request persistent storage
  if (capabilities.isPWA) {
    await requestPersistentStorage();
  }

  // Log storage usage
  const storage = await getStorageEstimate();
  if (storage) {
    console.log(
      `[PWA] Storage: ${storage.usageInMB.toFixed(2)}MB / ${storage.quotaInMB.toFixed(2)}MB (${storage.percentUsed.toFixed(1)}%)`,
    );
  }

  console.log("[PWA] Initialization complete");
};

export default {
  // Installation
  initPWAInstallPrompt,
  showInstallPrompt,
  canInstallPWA,
  isPWAInstalled,
  getPWADisplayMode,

  // Device capabilities
  getDeviceCapabilities,

  // Permissions
  requestCameraPermission,
  getCameraPermissionStatus,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  showNotification,

  // Background sync
  registerBackgroundSync,
  registerPeriodicSync,

  // Share
  canShare,
  shareContent,
  shareImage,

  // Network
  isOnline,
  onNetworkChange,

  // Service worker
  updateServiceWorker,
  unregisterServiceWorker,
  getServiceWorkerStatus,

  // Wake lock
  requestWakeLock,
  releaseWakeLock,

  // Storage
  getStorageEstimate,
  requestPersistentStorage,

  // Fullscreen
  requestFullscreen,
  exitFullscreen,

  // Init
  initPWA,
};
