import "./styles.css";
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  lazy,
} from "react";
import { Step, PassportSize, ProcessedImage, SheetMode } from "./types";
import ImageUploader from "./components/ImageUploader";
import PWAInstaller from "./components/PWAInstaller";
import PWAUpdateNotification from "./components/PWAUpdateNotification";
import OfflineIndicator from "./components/OfflineIndicator";
import OfflineStorageProvider, {
  useOfflineStorage,
} from "./components/OfflineStorage";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  UploadIcon,
  CropIcon,
  PrintIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  XIcon,
} from "./components/icons";
import { resizeImage } from "./utils/imageResizer";

// Lazy load heavy components to improve mobile performance
const ImageCropper = lazy(() => import("./components/ImageCropper"));
const PrintLayout = lazy(() => import("./components/PrintLayout"));

// Define a maximum dimension for images to optimize for mobile
const MAX_IMAGE_DIMENSION = 2000; // e.g., 2000px for the longest side

// Loading fallback for lazy components
const LazyLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="spinner"></div>
  </div>
);

type AnimationDirection =
  | "slide-in-left"
  | "slide-out-left"
  | "slide-in-right"
  | "slide-out-right"
  | "";

const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};

const AppContent: React.FC = () => {
  const { isOnline, isStorageReady, saveProcessedImage, saveOfflineAction } =
    useOfflineStorage();

  // Initialize any necessary mobile optimizations
  useEffect(() => {
    // Mobile-specific optimizations can be added here if needed
    return () => {
      // Cleanup can be added here if needed
    };
  }, []);

  const [step, setStep] = useState<Step>(Step.UPLOAD);
  const [prevStep, setPrevStep] = useState<Step>(Step.UPLOAD);
  const [animation, setAnimation] = useState<AnimationDirection>("");

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Enhanced touch handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const touchStartTime = useRef(0);
  const isDragging = useRef(false);

  // Load theme from localStorage on initial load
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setTheme(isDarkMode ? "dark" : "light");
  }, []);

  const changeStep = useCallback(
    (newStep: Step) => {
      if (newStep === step) return;
      triggerHapticFeedback();
      const direction = newStep > step ? "left" : "right";
      setAnimation(`slide-out-${direction}`);
      setPrevStep(step);
      setStep(newStep);

      setTimeout(() => {
        setAnimation(`slide-in-${direction}`);
      }, 200); // Duration should be less than animation time
    },
    [step],
  );

  const handleReset = useCallback(() => {
    setProcessedImages([]);
    setImageQueue([]);
    setQueueTotal(0);
    setUploadedImage(null);
    setSheetMode(null);
    changeStep(Step.UPLOAD);
  }, [changeStep]);

  // This effect ensures we are on a valid step. If not, it resets.
  useEffect(() => {
    if (step === Step.CROP && !uploadedImage) {
      setProcessedImages([]);
      setImageQueue([]);
      setQueueTotal(0);
      setUploadedImage(null);
      setSheetMode(null);
      setStep(Step.UPLOAD);
    }
    if (step === Step.PRINT && processedImages.length === 0) {
      setProcessedImages([]);
      setImageQueue([]);
      setQueueTotal(0);
      setUploadedImage(null);
      setSheetMode(null);
      setStep(Step.UPLOAD);
    }
  }, [step, uploadedImage, processedImages.length]);

  const handleImagesSelected = useCallback(
    async (imageDataUrls: string[]) => {
      if (imageDataUrls.length === 0) return;

      // Resize all images before adding to queue
      const resizedImagesPromises = imageDataUrls.map(async (dataUrl) => {
        try {
          return await resizeImage(
            dataUrl,
            MAX_IMAGE_DIMENSION,
            MAX_IMAGE_DIMENSION,
          );
        } catch (error) {
          console.error("Error resizing image:", error);
          // If resizing fails, use the original image
          return dataUrl;
        }
      });

      const resizedImageDataUrls = await Promise.all(resizedImagesPromises);

      const firstImage = resizedImageDataUrls[0];
      const restOfImages = resizedImageDataUrls.slice(1);
      setImageQueue(restOfImages);
      setQueueTotal((prev) => prev + resizedImageDataUrls.length);
      setUploadedImage(firstImage);
      changeStep(Step.CROP);
    },
    [changeStep],
  );

  const handleAddToSheet = useCallback(
    async (
      dataUrl: string,
      size: PassportSize,
      pixelDimensions?: { width: number; height: number },
      finalAction: "print" | "upload" = "print",
    ) => {
      const newImage = {
        id: Date.now().toString(),
        dataUrl,
        size,
        width_px: pixelDimensions?.width,
        height_px: pixelDimensions?.height,
        rotation: 0 as const,
      };

      setProcessedImages((prev) => {
        if (prev.length === 0) {
          if (size.name === "Random Size") {
            setSheetMode({ mode: "random" });
          } else {
            setSheetMode({ mode: "standard", size: size });
          }
        }
        return [...prev, newImage];
      });

      // Save to offline storage if available
      if (isStorageReady) {
        try {
          await saveProcessedImage({
            id: newImage.id,
            dataUrl: newImage.dataUrl,
            size: newImage.size,
            timestamp: Date.now(),
            metadata: { pixelDimensions, rotation: 0 as const },
          });
        } catch (error) {
          console.error("Failed to save image offline:", error);
        }
      }

      // [FIX 3] Refactored logic to prevent race condition
      if (imageQueue.length > 0) {
        const nextImage = imageQueue[0];
        setImageQueue((prev) => prev.slice(1));
        setUploadedImage(nextImage);
        changeStep(Step.CROP);
      } else {
        if (finalAction === "print") {
          changeStep(Step.PRINT);
        } else {
          changeStep(Step.UPLOAD);
        }
        setUploadedImage(null);
        setQueueTotal(0);
      }
    },
    [imageQueue, changeStep, isStorageReady, saveProcessedImage],
  );

  useEffect(() => {
    if (
      imageQueue.length === 0 &&
      step === Step.CROP &&
      uploadedImage === null
    ) {
      changeStep(Step.PRINT);
    }
  }, [imageQueue, step, uploadedImage, changeStep]);

  const handleNavigate = useCallback(
    (targetStep: Step) => {
      if (step === targetStep) return;
      if (targetStep === Step.UPLOAD) {
        handleReset();
      } else if (targetStep === Step.PRINT && processedImages.length > 0) {
        changeStep(Step.PRINT);
      }
    },
    [step, processedImages, handleReset, changeStep],
  );

  // Enhanced touch handling for better mobile experience
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent multiple touches and ensure single touch handling
    if (e.targetTouches.length > 1) return;
    
    const touch = e.targetTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    
    // Prevent default to reduce interference
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Only handle single touch
    if (e.targetTouches.length > 1) return;
    
    const touch = e.targetTouches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;
    
    // Prevent scrolling during active gestures
    const deltaX = Math.abs(touchEndX.current - touchStartX.current);
    const deltaY = Math.abs(touchEndY.current - touchStartY.current);
    
    // If horizontal movement is significant, prevent scrolling
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaTime = Date.now() - touchStartTime.current;
    const deltaX = Math.abs(touchEndX.current - touchStartX.current);
    const deltaY = Math.abs(touchEndY.current - touchStartY.current);
    
    // Enhanced swipe detection with time and distance thresholds
    const minSwipeDistance = 50;
    const maxSwipeTime = 300; // Maximum time for a quick swipe gesture
    
    // Only trigger if it's a quick, deliberate swipe
    if (deltaX >= minSwipeDistance && deltaX > deltaY && deltaTime <= maxSwipeTime) {
      if (touchStartX.current - touchEndX.current > minSwipeDistance) {
        // Swiped left - navigate forward
        if (step === Step.CROP && processedImages.length > 0)
          changeStep(Step.PRINT);
        if (step === Step.UPLOAD && uploadedImage) changeStep(Step.CROP);
      }

      if (touchEndX.current - touchStartX.current > minSwipeDistance) {
        // Swiped right - navigate backward
        if (step === Step.CROP) handleNavigate(Step.UPLOAD);
        if (step === Step.PRINT) changeStep(Step.CROP);
      }
    }
    
    // Reset touch coordinates
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
    touchStartTime.current = 0;
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    triggerHapticFeedback();
  };

  const renderStepComponent = (stepToRender: Step) => {
    switch (stepToRender) {
      case Step.UPLOAD:
        return <ImageUploader onImagesUpload={handleImagesSelected} />;
      case Step.CROP:
        // Let the useEffect handle redirection if uploadedImage is null
        if (uploadedImage) {
          const queuePosition = queueTotal - imageQueue.length;
          return (
            <ErrorBoundary>
              <Suspense fallback={<LazyLoadingFallback />}>
                <ImageCropper
                  key={uploadedImage} // Use image source as key to force remount
                  imageSrc={uploadedImage}
                  onProcess={handleAddToSheet}
                  onBack={handleReset}
                  queuePosition={queuePosition > 0 ? queuePosition : undefined}
                  queueLength={queueTotal > 1 ? queueTotal : undefined}
                  sheetMode={sheetMode}
                />
              </Suspense>
            </ErrorBoundary>
          );
        }
        return null;
      case Step.PRINT:
        // Let the useEffect handle redirection if there are no images
        if (processedImages.length > 0) {
          return (
            <ErrorBoundary>
              <Suspense fallback={<LazyLoadingFallback />}>
                <PrintLayout
                  images={processedImages}
                  setImages={setProcessedImages}
                  onReset={handleReset}
                  onBack={() => changeStep(Step.CROP)}
                />
              </Suspense>
            </ErrorBoundary>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    step: Step;
    currentStep: Step;
    badgeCount?: number;
    onClick?: () => void;
  }> = ({ icon, label, step, currentStep, badgeCount, onClick }) => {
    const isActive = step === currentStep;
    const isCompleted = currentStep > step;

    return (
      <button
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] focus-visible:ring-[var(--accent-primary)] rounded-xl p-2 sm:p-3 min-h-touch min-w-touch touch-target active:scale-95 ${onClick ? "" : "cursor-default"} ${isActive ? "bg-[var(--accent-primary-light)]" : ""}`}
        aria-label={`Go to ${label} step`}
      >
        <div className="relative">
          <div
            className={`transition-all duration-300 transform ${
              isActive
                ? "text-[var(--accent-primary)] scale-110"
                : isCompleted
                  ? "text-[var(--accent-secondary)]"
                  : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
            }`}
          >
            {icon}
          </div>
          {badgeCount && badgeCount > 0 ? (
            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border-2 border-[var(--card-bg)] shadow-md animate-pulse text-[10px] sm:text-xs">
              {badgeCount}
            </span>
          ) : null}
        </div>
        <span
          className={`text-xs sm:text-xs font-semibold mt-1 transition-all duration-300 ${
            isActive
              ? "text-[var(--accent-primary)]"
              : isCompleted
                ? "text-[var(--accent-secondary)]"
                : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
          }`}
        >
          {label}
        </span>
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 sm:w-8 sm:h-1 bg-[var(--accent-primary)] rounded-full"></div>
        )}
      </button>
    );
  };

  return (
    <div
      className="min-h-screen h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--background-gradient)" }}
    >
      {/* Mobile-First Header */}
      <header
        className="fixed top-0 left-0 right-0 h-16 px-3 sm:px-4 md:px-6 bg-[var(--card-bg)] backdrop-blur-lg border-b border-[var(--card-border)] z-30 flex items-center justify-between animate-fade-in shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Logo & Title Section - Mobile Optimized */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <img
              src="/favicon.svg"
              alt="Image to Print Pro Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-md transition-transform duration-300 hover:scale-110 hover:rotate-6"
            />
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl opacity-20 blur-sm -z-10"></div>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-[var(--text-primary)] tracking-tight truncate">
              Image to Print
            </h1>
            <p className="hidden md:block text-xs text-[var(--text-tertiary)] font-medium">
              Pro Editor
            </p>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 elevate"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <div className="relative w-6 h-6">
              <MoonIcon
                className={`w-6 h-6 text-[var(--text-secondary)] absolute inset-0 transition-all duration-500 ${
                  theme === "light"
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 -rotate-180 scale-0"
                }`}
              />
              <SunIcon
                className={`w-6 h-6 text-[var(--text-secondary)] absolute inset-0 transition-all duration-500 ${
                  theme === "dark"
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-180 scale-0"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)] transition-all duration-300 min-h-touch min-w-touch touch-target"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <XIcon className="w-6 h-6 text-[var(--text-secondary)]" />
          ) : (
            <MenuIcon className="w-6 h-6 text-[var(--text-secondary)]" />
          )}
        </button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed top-16 right-0 w-full max-w-xs bg-[var(--card-bg)] border-l border-[var(--card-border)] shadow-xl animate-slide-up">
              <div className="p-4 space-y-3">
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)] transition-all duration-300 text-left"
                >
                  <div className="relative w-6 h-6">
                    <MoonIcon
                      className={`w-6 h-6 text-[var(--text-secondary)] absolute inset-0 transition-all duration-500 ${
                        theme === "light"
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 -rotate-180 scale-0"
                      }`}
                    />
                    <SunIcon
                      className={`w-6 h-6 text-[var(--text-secondary)] absolute inset-0 transition-all duration-500 ${
                        theme === "dark"
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 rotate-180 scale-0"
                      }`}
                    />
                  </div>
                  <span className="text-[var(--text-primary)] font-medium">
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main
        className="flex-grow pt-16 w-full overflow-y-auto overflow-x-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`w-full min-h-full p-3 sm:p-4 md:p-6 pb-20 sm:pb-24 md:pb-28 transition-all duration-300 ${animation}`}
        >
          {renderStepComponent(step)}
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 h-16 sm:h-20 bg-[var(--card-bg)] backdrop-blur-lg border-t border-[var(--card-border)] z-30 shadow-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto h-full flex justify-around items-center px-2 sm:px-4">
          <NavItem
            icon={<UploadIcon />}
            label="Upload"
            step={Step.UPLOAD}
            currentStep={step}
            onClick={() => handleNavigate(Step.UPLOAD)}
          />
          <NavItem
            icon={<CropIcon />}
            label="Edit"
            step={Step.CROP}
            currentStep={step}
          />
          <NavItem
            icon={<PrintIcon />}
            label="Print"
            step={Step.PRINT}
            currentStep={step}
            onClick={() => handleNavigate(Step.PRINT)}
            badgeCount={processedImages.length}
          />
        </div>
      </nav>

      {/* PWA Installer Component */}
      <PWAInstaller />

      {/* PWA Update Notification */}
      <PWAUpdateNotification />

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <OfflineStorageProvider>
        <AppContent />
      </OfflineStorageProvider>
    </ErrorBoundary>
  );
};

export default App;
