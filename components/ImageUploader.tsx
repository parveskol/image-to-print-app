import React, { useCallback, useState } from "react";
import { UploadIcon, CameraIcon } from "./icons";

interface ImageUploaderProps {
  onImagesUpload: (imageDataUrls: string[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && file.type.startsWith("image/")) validFiles.push(file);
      }
      if (validFiles.length === 0) {
        setError("No valid image files selected (PNG, JPG, etc.).");
        return;
      }

      setError(null);
      const readers: Promise<string>[] = validFiles.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (typeof e.target?.result === "string")
                resolve(e.target.result);
              else reject(new Error(`Failed to read file ${file.name}`));
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          }),
      );

      Promise.all(readers)
        .then((results) => onImagesUpload(results))
        .catch((err) => {
          console.error(err);
          setError("There was an error reading one or more files.");
        });
    },
    [onImagesUpload],
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0)
      handleFiles(e.target.files);
  };

  return (
    <div
      className="min-h-[calc(100vh-7rem)] flex items-center justify-center p-3 sm:p-4 md:p-6 safe-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="w-full">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent leading-tight">
                  Upload Your Photos
                </h2>
                <p className="text-[var(--text-secondary)] text-base sm:text-base">
                  Transform your images into perfect prints
                </p>
              </div>

              <div
                className={`relative flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed rounded-2xl transition-all duration-500 ${
                  isDragging
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 scale-[1.02] shadow-lg shadow-[var(--accent-primary)]/20"
                    : "border-[var(--control-border)] bg-[var(--control-bg)]/40 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--control-bg)]/60"
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div
                    className={`transition-all duration-500 ${
                      isDragging ? "scale-110 rotate-12" : "scale-100 rotate-0"
                    }`}
                  >
                    <UploadIcon className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--accent-primary)] opacity-80" />
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] text-base font-medium mb-1">
                      <label
                        htmlFor="file-upload"
                        className="font-bold text-[var(--accent-primary)] cursor-pointer hover:text-[var(--accent-primary-hover)] transition-colors duration-300 px-2 py-1 rounded-lg hover:bg-[var(--accent-primary)]/10"
                      >
                        Choose files
                      </label>{" "}
                      or drag them here
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)] mt-2 flex items-center justify-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 bg-[var(--control-bg)] px-2 py-1 rounded-md">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        PNG
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[var(--control-bg)] px-2 py-1 rounded-md">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        JPG
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[var(--control-bg)] px-2 py-1 rounded-md">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        WebP
                      </span>
                    </p>
                  </div>
                </div>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </div>

              <div className="divider-text my-6">
                <span>OR</span>
              </div>

              {/* Mobile camera capture */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                id="mobile-camera-input"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(e.target.files);
                    e.target.value = ""; // Reset input
                  }
                }}
              />
              <label
                htmlFor="mobile-camera-input"
                className="w-full flex items-center justify-center bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] focus-visible:ring-[var(--accent-primary)] cursor-pointer min-h-touch touch-target shadow-lg hover:shadow-xl"
              >
                <CameraIcon className="w-5 h-5 mr-2" />
                <span>Quick Capture (Mobile)</span>
              </label>

              {error && (
                <div className="mt-6 animate-slide-up">
                  <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 text-[var(--accent-error)] p-4 rounded-xl flex items-start gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
