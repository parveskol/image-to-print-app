import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom/client";
import type { Root } from "react-dom/client";
import { ProcessedImage, PassportSize } from "../types";
import { A4_DIMENSIONS_MM, DPI } from "../constants";
import { BackIcon, PrintIcon, RotateCwIcon } from "./icons";

// TypeScript declarations for CDN-loaded libraries
declare const html2canvas: (
  element: HTMLElement,
  options?: any,
) => Promise<HTMLCanvasElement>;
declare const jspdf: { jsPDF: new (options?: any) => any };

interface PrintLayoutProps {
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  onReset: () => void;
  onBack: () => void;
}

const mmToPx = (mm: number) => (mm / 25.4) * DPI;

const MARK_THICKNESS_PX = 1;
const MARK_LENGTH_PX = 10;
const MARK_PADDING_PX = 2;

const calculateLayoutInfo = (
  paperWidthMm: number,
  paperHeightMm: number,
  photoSize: PassportSize | null,
  margins: { top: number; right: number; bottom: number; left: number },
  showCutMarks: boolean,
  noGap: boolean,
) => {
  if (!photoSize || photoSize.name === "Random Size")
    return { portrait: 0, landscape: 0, max: 0, rotateForMax: false };

  const printableWidthMm = paperWidthMm - margins.left - margins.right;
  const printableHeightMm = paperHeightMm - margins.top - margins.bottom;

  if (printableWidthMm <= 0 || printableHeightMm <= 0) {
    return { portrait: 0, landscape: 0, max: 0, rotateForMax: false };
  }

  const gapMm = noGap ? 0 : 2;
  const markPaddingMm =
    showCutMarks && !noGap ? (MARK_PADDING_PX / DPI) * 25.4 : 0;

  const printableWidthPx = mmToPx(printableWidthMm);
  const printableHeightPx = mmToPx(printableHeightMm);
  const gapPx = mmToPx(gapMm);
  const markPaddingPx = mmToPx(markPaddingMm);

  // Portrait photo calc
  const totalWidthPerImage_P = mmToPx(photoSize.width_mm) + markPaddingPx * 2;
  const totalHeightPerImage_P = mmToPx(photoSize.height_mm) + markPaddingPx * 2;
  const cols_P =
    totalWidthPerImage_P > 0
      ? Math.floor((printableWidthPx + gapPx) / (totalWidthPerImage_P + gapPx))
      : 0;
  const rows_P =
    totalHeightPerImage_P > 0
      ? Math.floor(
          (printableHeightPx + gapPx) / (totalHeightPerImage_P + gapPx),
        )
      : 0;
  const portraitMax = cols_P * rows_P;

  // Landscape photo calc (photo is rotated)
  const totalWidthPerImage_L = mmToPx(photoSize.height_mm) + markPaddingPx * 2;
  const totalHeightPerImage_L = mmToPx(photoSize.width_mm) + markPaddingPx * 2;
  const cols_L =
    totalWidthPerImage_L > 0
      ? Math.floor((printableWidthPx + gapPx) / (totalWidthPerImage_L + gapPx))
      : 0;
  const rows_L =
    totalHeightPerImage_L > 0
      ? Math.floor(
          (printableHeightPx + gapPx) / (totalHeightPerImage_L + gapPx),
        )
      : 0;
  const landscapeMax = cols_L * rows_L;

  return {
    portrait: portraitMax,
    landscape: landscapeMax,
    max: Math.max(portraitMax, landscapeMax),
    rotateForMax: landscapeMax > portraitMax,
  };
};

interface PositionedImage extends ProcessedImage {
  x: number;
  y: number;
  renderWidth: number;
  renderHeight: number;
}

// This component is now only used for the fallback rendering method
const PrintSheet: React.FC<{
  page: PositionedImage[];
  showCutMarks: boolean;
  paperDimensions: { width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
  noGap: boolean;
}> = ({ page, showCutMarks, paperDimensions, margins, noGap }) => {
  const paperWidthPx = mmToPx(paperDimensions.width);
  const paperHeightPx = mmToPx(paperDimensions.height);

  const markStyle = {
    position: "absolute" as const,
    background: "black",
  };

  const markPaddingMm = showCutMarks && !noGap ? MARK_PADDING_PX : 0;
  const markPaddingPx = mmToPx(markPaddingMm);

  const isRandomSizeMode =
    page.length > 0 && page[0].size.name === "Random Size";

  return (
    <div
      id="print-area"
      className="bg-white shadow-lg mx-auto"
      style={{
        width: `${paperWidthPx}px`,
        height: `${paperHeightPx}px`,
        position: "relative",
      }}
    >
      <div
        className="printable-area"
        style={{
          position: "absolute",
          top: `${mmToPx(margins.top)}px`,
          left: `${mmToPx(margins.left)}px`,
          width: `${mmToPx(paperDimensions.width - margins.left - margins.right)}px`,
          height: `${mmToPx(paperDimensions.height - margins.top - margins.bottom)}px`,
        }}
      >
        {page.map((img, index) => {
          const imgWidthPx = isRandomSizeMode
            ? img.renderWidth - markPaddingPx * 2
            : mmToPx(img.size.width_mm);
          const imgHeightPx = isRandomSizeMode
            ? img.renderHeight - markPaddingPx * 2
            : mmToPx(img.size.height_mm);

          return (
            <div
              key={`${img.id}-${index}`}
              className="absolute"
              style={{
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.renderWidth}px`,
                height: `${img.renderHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={img.dataUrl}
                alt="Print"
                style={{
                  width: `${imgWidthPx}px`,
                  height: `${imgHeightPx}px`,
                  objectFit: "cover",
                  transform: `rotate(${img.rotation === 90 ? "90deg" : "0deg"})`,
                }}
              />
              {showCutMarks &&
                !isRandomSizeMode &&
                (noGap ? (
                  <>
                    <div
                      style={{
                        ...markStyle,
                        top: 0,
                        left: 0,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        top: 0,
                        left: 0,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        top: 0,
                        right: 0,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        top: 0,
                        right: 0,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: 0,
                        left: 0,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: 0,
                        left: 0,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: 0,
                        right: 0,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: 0,
                        right: 0,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        ...markStyle,
                        top: `0px`,
                        left: `${markPaddingPx}px`,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        top: `${markPaddingPx}px`,
                        left: `0px`,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        top: `0px`,
                        right: `${markPaddingPx}px`,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        top: `${markPaddingPx}px`,
                        right: `0px`,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: `0px`,
                        left: `${markPaddingPx}px`,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: `${markPaddingPx}px`,
                        left: `0px`,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: `0px`,
                        right: `${markPaddingPx}px`,
                        width: `${MARK_THICKNESS_PX}px`,
                        height: `${MARK_LENGTH_PX}px`,
                      }}
                    />
                    <div
                      style={{
                        ...markStyle,
                        bottom: `${markPaddingPx}px`,
                        right: `0px`,
                        width: `${MARK_LENGTH_PX}px`,
                        height: `${MARK_THICKNESS_PX}px`,
                      }}
                    />
                  </>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PrintPreview: React.FC<{
  page: PositionedImage[];
  showCutMarks: boolean;
  paperDimensions: { width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
  noGap: boolean;
}> = ({ page, showCutMarks, paperDimensions, margins, noGap }) => {
  const { width: paperWidthMm, height: paperHeightMm } = paperDimensions;

  const printableWidthMm = paperWidthMm - margins.left - margins.right;
  const printableHeightMm = paperHeightMm - margins.top - margins.bottom;

  if (printableWidthMm <= 0 || printableHeightMm <= 0) {
    return (
      <div
        className="w-full bg-white/10 flex items-center justify-center text-red-400 p-4 text-center rounded-md"
        style={{ aspectRatio: `${paperWidthMm || 1} / ${paperHeightMm || 1}` }}
      >
        Invalid margin settings. Printable area has zero or negative size.
      </div>
    );
  }

  const isRandomSizeMode =
    page.length > 0 && page[0].size.name === "Random Size";
  const printableWidthPx = mmToPx(printableWidthMm);
  const printableHeightPx = mmToPx(printableHeightMm);

  const markPaddingMm = showCutMarks && !noGap ? MARK_PADDING_PX : 0;
  const markPaddingPx = mmToPx(markPaddingMm);

  return (
    <div
      className="w-full max-w-full max-h-full bg-white shadow-xl relative border border-slate-300 dark:border-slate-600"
      style={{ aspectRatio: `${paperWidthMm} / ${paperHeightMm}` }}
    >
      <div
        className="absolute"
        style={{
          top: `${(margins.top / paperHeightMm) * 100}%`,
          left: `${(margins.left / paperWidthMm) * 100}%`,
          width: `${(printableWidthMm / paperWidthMm) * 100}%`,
          height: `${(printableHeightMm / paperHeightMm) * 100}%`,
        }}
      >
        {page.map((img, index) => {
          const imgContainerStyle: React.CSSProperties = {
            position: "absolute",
            left: `${(img.x / printableWidthPx) * 100}%`,
            top: `${(img.y / printableHeightPx) * 100}%`,
            width: `${(img.renderWidth / printableWidthPx) * 100}%`,
            height: `${(img.renderHeight / printableHeightPx) * 100}%`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          };

          const imgWidthPx = isRandomSizeMode
            ? img.renderWidth - markPaddingPx * 2
            : mmToPx(img.size.width_mm);
          const imgHeightPx = isRandomSizeMode
            ? img.renderHeight - markPaddingPx * 2
            : mmToPx(img.size.height_mm);

          const markThickness = "1px";
          const markLength = "8px";
          const markPaddingPercentX =
            img.renderWidth > 0 ? (markPaddingPx / img.renderWidth) * 100 : 0;
          const markPaddingPercentY =
            img.renderHeight > 0 ? (markPaddingPx / img.renderHeight) * 100 : 0;

          return (
            <div key={`${img.id}-${index}`} style={imgContainerStyle}>
              <img
                src={img.dataUrl}
                alt="Print preview"
                style={{
                  width: `${img.renderWidth > 0 ? (imgWidthPx / img.renderWidth) * 100 : 0}%`,
                  height: `${img.renderHeight > 0 ? (imgHeightPx / img.renderHeight) * 100 : 0}%`,
                  position: "absolute",
                  objectFit: "cover",
                  transform: `rotate(${img.rotation === 90 ? "90deg" : "0deg"})`,
                }}
              />
              {showCutMarks && !isRandomSizeMode && (
                <div className="absolute w-full h-full">
                  {noGap ? (
                    <>
                      <div
                        className="absolute bg-black"
                        style={{
                          top: 0,
                          left: 0,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          top: 0,
                          left: 0,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          top: 0,
                          right: 0,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          top: 0,
                          right: 0,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: 0,
                          left: 0,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: 0,
                          left: 0,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: 0,
                          right: 0,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: 0,
                          right: 0,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div
                        className="absolute bg-black"
                        style={{
                          top: `0px`,
                          left: `${markPaddingPercentX}%`,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          top: `${markPaddingPercentY}%`,
                          left: `0px`,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          top: `0px`,
                          right: `${markPaddingPercentX}%`,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          top: `${markPaddingPercentY}%`,
                          right: `0px`,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: `0px`,
                          left: `${markPaddingPercentX}%`,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: `${markPaddingPercentY}%`,
                          left: `0px`,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: `0px`,
                          right: `${markPaddingPercentX}%`,
                          width: markThickness,
                          height: markLength,
                        }}
                      />
                      <div
                        className="absolute bg-black"
                        style={{
                          bottom: `${markPaddingPercentY}%`,
                          right: `0px`,
                          width: markLength,
                          height: markThickness,
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

type SheetProps = React.ComponentProps<typeof PrintSheet>;

// --- New Rendering Engine ---

const renderSheetDirectlyToCanvas = async (
  props: SheetProps,
): Promise<HTMLCanvasElement> => {
  const { page, showCutMarks, paperDimensions, margins, noGap } = props;

  const paperWidthPx = mmToPx(paperDimensions.width);
  const paperHeightPx = mmToPx(paperDimensions.height);

  const canvas = document.createElement("canvas");
  canvas.width = paperWidthPx;
  canvas.height = paperHeightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context from canvas.");

  // 1. Fill background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, paperWidthPx, paperHeightPx);

  // 2. Asynchronously load all images
  const imageElements = await Promise.all(
    page.map(
      (img) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const imageEl = new Image();
          imageEl.onload = () => resolve(imageEl);
          imageEl.onerror = (err) =>
            reject(new Error(`Failed to load image: ${img.id}`));
          imageEl.src = img.dataUrl;
        }),
    ),
  );

  // 3. Draw images and cut marks
  const marginX = mmToPx(margins.left);
  const marginY = mmToPx(margins.top);
  const isRandomSizeMode =
    page.length > 0 && page[0].size.name === "Random Size";
  const markPaddingPx = mmToPx(showCutMarks && !noGap ? MARK_PADDING_PX : 0);

  ctx.strokeStyle = "black";
  ctx.lineWidth = MARK_THICKNESS_PX;

  for (let i = 0; i < page.length; i++) {
    const imgData = page[i];
    const imageEl = imageElements[i];

    const imgContainerX = marginX + imgData.x;
    const imgContainerY = marginY + imgData.y;

    const imgWidthPx = isRandomSizeMode
      ? imgData.renderWidth - markPaddingPx * 2
      : mmToPx(imgData.size.width_mm);
    const imgHeightPx = isRandomSizeMode
      ? imgData.renderHeight - markPaddingPx * 2
      : mmToPx(imgData.size.height_mm);

    const destX = imgContainerX + (imgData.renderWidth - imgWidthPx) / 2;
    const destY = imgContainerY + (imgData.renderHeight - imgHeightPx) / 2;

    // Draw image with rotation
    ctx.save();
    if (imgData.rotation === 90) {
      ctx.translate(destX + imgWidthPx / 2, destY + imgHeightPx / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(
        imageEl,
        -imgHeightPx / 2,
        -imgWidthPx / 2,
        imgHeightPx,
        imgWidthPx,
      );
    } else {
      ctx.drawImage(imageEl, destX, destY, imgWidthPx, imgHeightPx);
    }
    ctx.restore();

    // Draw cut marks
    if (showCutMarks && !isRandomSizeMode) {
      if (noGap) {
        // corners of the image container
        ctx.beginPath();
        ctx.moveTo(imgContainerX, imgContainerY + MARK_LENGTH_PX);
        ctx.lineTo(imgContainerX, imgContainerY);
        ctx.lineTo(imgContainerX + MARK_LENGTH_PX, imgContainerY);
        ctx.moveTo(
          imgContainerX + imgData.renderWidth - MARK_LENGTH_PX,
          imgContainerY,
        );
        ctx.lineTo(imgContainerX + imgData.renderWidth, imgContainerY);
        ctx.lineTo(
          imgContainerX + imgData.renderWidth,
          imgContainerY + MARK_LENGTH_PX,
        );
        ctx.moveTo(
          imgContainerX,
          imgContainerY + imgData.renderHeight - MARK_LENGTH_PX,
        );
        ctx.lineTo(imgContainerX, imgContainerY + imgData.renderHeight);
        ctx.lineTo(
          imgContainerX + MARK_LENGTH_PX,
          imgContainerY + imgData.renderHeight,
        );
        ctx.moveTo(
          imgContainerX + imgData.renderWidth - MARK_LENGTH_PX,
          imgContainerY + imgData.renderHeight,
        );
        ctx.lineTo(
          imgContainerX + imgData.renderWidth,
          imgContainerY + imgData.renderHeight,
        );
        ctx.lineTo(
          imgContainerX + imgData.renderWidth,
          imgContainerY + imgData.renderHeight - MARK_LENGTH_PX,
        );
        ctx.stroke();
      } else {
        // corners of the photo itself, inside the padded container
        ctx.beginPath();
        ctx.moveTo(destX, destY + MARK_LENGTH_PX);
        ctx.lineTo(destX, destY);
        ctx.lineTo(destX + MARK_LENGTH_PX, destY);
        ctx.moveTo(destX + imgWidthPx - MARK_LENGTH_PX, destY);
        ctx.lineTo(destX + imgWidthPx, destY);
        ctx.lineTo(destX + imgWidthPx, destY + MARK_LENGTH_PX);
        ctx.moveTo(destX, destY + imgHeightPx - MARK_LENGTH_PX);
        ctx.lineTo(destX, destY + imgHeightPx);
        ctx.lineTo(destX + MARK_LENGTH_PX, destY + imgHeightPx);
        ctx.moveTo(destX + imgWidthPx - MARK_LENGTH_PX, destY + imgHeightPx);
        ctx.lineTo(destX + imgWidthPx, destY + imgHeightPx);
        ctx.lineTo(destX + imgWidthPx, destY + imgHeightPx - MARK_LENGTH_PX);
        ctx.stroke();
      }
    }
  }

  return canvas;
};

const renderSheetWithHtml2Canvas = async (
  sheetProps: SheetProps,
): Promise<HTMLCanvasElement> => {
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "-9999px";
  document.body.appendChild(tempContainer);

  let root: Root | null = null;
  try {
    root = ReactDOM.createRoot(tempContainer);
    await new Promise<void>((resolve) => {
      root!.render(<PrintSheet {...sheetProps} />);
      setTimeout(resolve, 200); // Give React time to render
    });

    const printArea = tempContainer.querySelector("#print-area") as HTMLElement;
    if (!printArea)
      throw new Error("Could not find #print-area element for capturing.");

    return await html2canvas(printArea, {
      scale: 1,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        const el = clonedDoc.querySelector("#print-area");
        if (el) (el as HTMLElement).style.backgroundColor = "white";
      },
    });
  } finally {
    if (root) root.unmount();
    document.body.removeChild(tempContainer);
  }
};

// Smart renderer with fallback and memory management
const renderPageToCanvas = async (
  sheetProps: SheetProps,
): Promise<HTMLCanvasElement> => {
  try {
    return await renderSheetDirectlyToCanvas(sheetProps);
  } catch (error) {
    console.warn(
      "Direct canvas rendering failed. Falling back to html2canvas.",
      error,
    );
    try {
      return await renderSheetWithHtml2Canvas(sheetProps);
    } catch (fallbackError) {
      console.error("Both rendering methods failed:", fallbackError);
      throw new Error(
        "Failed to render page due to memory constraints. Try reducing image count or quality.",
      );
    }
  }
};

const PrintLayout: React.FC<PrintLayoutProps> = ({
  images,
  setImages,
  onReset,
  onBack,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showCutMarks, setShowCutMarks] = useState(false);
  const [paperType, setPaperType] = useState<"a4" | "custom">("a4");
  const [customPaperSize, setCustomPaperSize] = useState({
    width: 100,
    height: 150,
  });
  const [paperOrientation, setPaperOrientation] = useState<
    "portrait" | "landscape"
  >("portrait");
  const [margins, setMargins] = useState({
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  });
  const [noGap, setNoGap] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rotatePhotos, setRotatePhotos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [randomImageScale, setRandomImageScale] = useState(1);

  const passportSize = images.length > 0 ? images[0].size : null;
  const isRandomSizeMode = passportSize?.name === "Random Size";

  const basePaperDimensions = useMemo(
    () => (paperType === "a4" ? A4_DIMENSIONS_MM : customPaperSize),
    [paperType, customPaperSize],
  );
  const paperDimensions = useMemo(() => {
    return paperOrientation === "landscape"
      ? { width: basePaperDimensions.height, height: basePaperDimensions.width }
      : basePaperDimensions;
  }, [basePaperDimensions, paperOrientation]);

  const layoutInfo = useMemo(
    () =>
      calculateLayoutInfo(
        paperDimensions.width,
        paperDimensions.height,
        passportSize,
        margins,
        showCutMarks,
        noGap,
      ),
    [paperDimensions, passportSize, margins, showCutMarks, noGap],
  );
  const maxPhotos = layoutInfo.max;
  const totalCount = (Object.values(quantities) as number[]).reduce(
    (sum, count) => sum + count,
    0,
  );

  const imagesToPrint = useMemo(() => {
    if (isRandomSizeMode) return images;
    const flatArray: ProcessedImage[] = [];
    const sortedImageIds = Object.keys(quantities).sort(
      (a, b) =>
        images.findIndex((img) => img.id === a) -
        images.findIndex((img) => img.id === b),
    );

    for (const id of sortedImageIds) {
      const image = images.find((img) => img.id === id);
      if (image) {
        for (let i = 0; i < (quantities[id] || 0); i++) {
          flatArray.push(image);
        }
      }
    }
    return flatArray;
  }, [quantities, images, isRandomSizeMode]);

  const paginatedLayout = useMemo<PositionedImage[][]>(() => {
    if (imagesToPrint.length === 0) return [];

    const printableWidthPx = mmToPx(
      paperDimensions.width - margins.left - margins.right,
    );
    const printableHeightPx = mmToPx(
      paperDimensions.height - margins.top - margins.bottom,
    );
    if (printableWidthPx <= 0 || printableHeightPx <= 0) return [];

    const gapPx = mmToPx(noGap ? 0 : 2);
    const pages: PositionedImage[][] = [[]];
    let pageIndex = 0;

    if (isRandomSizeMode) {
      // Simple row-based layout
      const baseTargetHeight = mmToPx(45);
      const TARGET_HEIGHT_PX =
        Math.min(baseTargetHeight, printableHeightPx) * randomImageScale;
      let cursor = { x: 0, y: 0 };
      let rowHeight = 0;

      for (const img of imagesToPrint) {
        const aspect = img.width_px! / img.height_px!;
        let scaledWidth = TARGET_HEIGHT_PX * aspect;
        let scaledHeight = TARGET_HEIGHT_PX;

        if (img.rotation === 90) {
          [scaledWidth, scaledHeight] = [scaledHeight, scaledWidth];
        }

        if (cursor.x > 0 && cursor.x + scaledWidth > printableWidthPx) {
          cursor.x = 0;
          cursor.y += rowHeight + gapPx;
          rowHeight = 0;
        }

        if (cursor.y + scaledHeight > printableHeightPx) {
          pages.push([]);
          pageIndex++;
          cursor = { x: 0, y: 0 };
          rowHeight = 0;
        }

        pages[pageIndex].push({
          ...img,
          x: cursor.x,
          y: cursor.y,
          renderWidth: scaledWidth,
          renderHeight: scaledHeight,
        });
        cursor.x += scaledWidth + gapPx;
        rowHeight = Math.max(rowHeight, scaledHeight);
      }
    } else {
      // Single-page logic for standard sizes
      const markPaddingPx = mmToPx(
        showCutMarks && !noGap ? MARK_PADDING_PX : 0,
      );

      const photoW = rotatePhotos
        ? passportSize!.height_mm
        : passportSize!.width_mm;
      const photoH = rotatePhotos
        ? passportSize!.width_mm
        : passportSize!.height_mm;

      const totalWidth = mmToPx(photoW) + markPaddingPx * 2;
      const totalHeight = mmToPx(photoH) + markPaddingPx * 2;

      const cols =
        totalWidth > 0
          ? Math.floor((printableWidthPx + gapPx) / (totalWidth + gapPx))
          : 0;
      const rows =
        totalHeight > 0
          ? Math.floor((printableHeightPx + gapPx) / (totalHeight + gapPx))
          : 0;
      const itemsPerPage = cols * rows;

      if (itemsPerPage > 0) {
        const imagesForPage = imagesToPrint.slice(0, itemsPerPage); // Cap at one page
        for (let i = 0; i < imagesForPage.length; i++) {
          const itemOnPageIndex = i % itemsPerPage;
          const col = itemOnPageIndex % cols;
          const row = Math.floor(itemOnPageIndex / cols);
          pages[pageIndex].push({
            ...imagesForPage[i],
            x: col * (totalWidth + gapPx),
            y: row * (totalHeight + gapPx),
            renderWidth: totalWidth,
            renderHeight: totalHeight,
          });
        }
      }
    }
    return pages.filter((p) => p.length > 0);
  }, [
    imagesToPrint,
    paperDimensions,
    margins,
    noGap,
    isRandomSizeMode,
    showCutMarks,
    rotatePhotos,
    passportSize,
    randomImageScale,
  ]);

  useEffect(() => {
    if (currentPage > paginatedLayout.length && paginatedLayout.length > 0) {
      setCurrentPage(paginatedLayout.length);
    } else if (paginatedLayout.length === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, paginatedLayout.length]);

  useEffect(() => {
    if (isRandomSizeMode) return;
    const newQuantities: Record<string, number> = {};
    if (images.length > 0 && maxPhotos > 0) {
      const baseCount = Math.floor(maxPhotos / images.length);
      let remainder = maxPhotos % images.length;
      for (const image of images) {
        newQuantities[image.id] = baseCount + (remainder-- > 0 ? 1 : 0);
      }
    }
    setQuantities(newQuantities);
  }, [images, maxPhotos, isRandomSizeMode]);

  const handleQuantityChange = (id: string, value: number) => {
    if (isRandomSizeMode) {
      setQuantities({ ...quantities, [id]: value });
      return;
    }

    const currentTotalWithoutThisImage = Object.entries(quantities)
      .filter(([key]) => key !== id)
      .reduce((sum: number, [, count]: [string, number]) => sum + count, 0);

    const maxForThisImage = maxPhotos - currentTotalWithoutThisImage;
    const newValue = Math.min(value, maxForThisImage);

    if (newValue >= 0) {
      setQuantities({ ...quantities, [id]: newValue });
    }
  };

  const handleMarginChange = (side: keyof typeof margins, value: string) => {
    const numValue = Number(value);
    if (numValue >= 0) setMargins((prev) => ({ ...prev, [side]: numValue }));
  };

  const handleRotateImage = (id: string) => {
    setImages((currentImages) =>
      currentImages.map((img) =>
        img.id === id
          ? { ...img, rotation: img.rotation === 90 ? 0 : 90 }
          : img,
      ),
    );
  };

  const handleFillPage = () => {
    if (images.length === 0 || !passportSize || isRandomSizeMode) return;
    const baseDims = paperType === "a4" ? A4_DIMENSIONS_MM : customPaperSize;

    const pResult = calculateLayoutInfo(
      baseDims.width,
      baseDims.height,
      passportSize,
      margins,
      showCutMarks,
      noGap,
    );
    const lResult = calculateLayoutInfo(
      baseDims.height,
      baseDims.width,
      passportSize,
      margins,
      showCutMarks,
      noGap,
    );

    const maxForFill = lResult.max > pResult.max ? lResult.max : pResult.max;
    setPaperOrientation(lResult.max > pResult.max ? "landscape" : "portrait");
    setRotatePhotos(
      lResult.max > pResult.max ? lResult.rotateForMax : pResult.rotateForMax,
    );

    if (maxForFill <= 0) {
      setQuantities(images.reduce((acc, img) => ({ ...acc, [img.id]: 0 }), {}));
      return;
    }

    const newQuantities: Record<string, number> = {};
    const baseCount = Math.floor(maxForFill / images.length);
    let remainder = maxForFill % images.length;
    images.forEach((image) => {
      newQuantities[image.id] = baseCount + (remainder-- > 0 ? 1 : 0);
    });
    setQuantities(newQuantities);
  };

  const generatePdf = async () => {
    if (paginatedLayout.length === 0) return null;
    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
      orientation: paperDimensions.width > paperDimensions.height ? "l" : "p",
      unit: "mm",
      format: [paperDimensions.width, paperDimensions.height],
    });

    for (let i = 0; i < paginatedLayout.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await renderPageToCanvas({
        page: paginatedLayout[i],
        showCutMarks,
        paperDimensions,
        margins,
        noGap,
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        paperDimensions.width,
        paperDimensions.height,
      );
    }
    return pdf;
  };

  const handlePrint = async () => {
    if (isExporting || typeof jspdf === "undefined") return;
    setIsExporting(true);
    try {
      const pdf = await generatePdf();
      if (!pdf) return;
      pdf.autoPrint();
      const blob = pdf.output("blob");
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (e) {
      console.error("Print failed:", e);
      alert("Error preparing file for printing.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async (format: "pdf" | "png") => {
    if (isExporting || (format === "pdf" && typeof jspdf === "undefined"))
      return;
    setIsExporting(true);
    try {
      if (format === "pdf") {
        const pdf = await generatePdf();
        if (pdf) pdf.save("passport-photos.pdf");
      } else if (format === "png" && paginatedLayout[currentPage - 1]) {
        const canvas = await renderPageToCanvas({
          page: paginatedLayout[currentPage - 1],
          showCutMarks,
          paperDimensions,
          margins,
          noGap,
        });
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `passport-photos_page_${currentPage}.png`;
        link.click();
        link.remove();
        // Cleanup canvas memory
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (e) {
      console.error("Export failed:", e);
      alert(
        "Export failed due to memory constraints. Try with fewer images or lower quality settings.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!passportSize) {
    return (
      <div className="text-center p-8 bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl">
        <h2 className="text-xl">No images to print.</h2>
        <button
          onClick={onBack}
          className="mt-4 bg-[var(--accent-primary)] px-4 py-2 rounded-lg text-white"
        >
          Add Photos
        </button>
      </div>
    );
  }

  const currentSheet = paginatedLayout[currentPage - 1] || [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start safe-bottom">
      <div className="flex-1 w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] flex flex-col">
        <h2 className="text-xl font-bold p-4 sm:p-6 border-b border-[var(--card-border)] text-[var(--text-primary)]">
          Print Preview
        </h2>
        <div className="bg-slate-200/50 dark:bg-slate-900/60 p-4 sm:p-6 rounded-b-2xl flex-grow flex justify-center items-center min-h-[50vh] lg:min-h-0">
          <PrintPreview
            page={currentSheet}
            showCutMarks={showCutMarks}
            paperDimensions={paperDimensions}
            margins={margins}
            noGap={noGap}
          />
        </div>
        {isRandomSizeMode && paginatedLayout.length > 1 && (
          <div className="flex justify-center items-center p-3 gap-4 border-t border-[var(--card-border)]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-[var(--control-bg)] rounded-md disabled:opacity-50 transition-colors hover:bg-[var(--control-bg)]/80"
            >
              Prev
            </button>
            <span className="font-semibold text-[var(--text-secondary)]">
              Page {currentPage} of {paginatedLayout.length}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(paginatedLayout.length, p + 1))
              }
              disabled={currentPage === paginatedLayout.length}
              className="px-4 py-2 bg-[var(--control-bg)] rounded-md disabled:opacity-50 transition-colors hover:bg-[var(--control-bg)]/80"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-y-6">
        <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
            Actions
          </h2>
          <div className="space-y-3">
            <button
              onClick={handlePrint}
              disabled={isExporting || imagesToPrint.length === 0}
              className="w-full flex items-center justify-center bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PrintIcon className="w-5 h-5 mr-2" />
              {isExporting ? "Processing..." : "Print / Save as PDF"}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport("pdf")}
                disabled={isExporting || imagesToPrint.length === 0}
                className="flex-1 flex items-center justify-center bg-[var(--accent-secondary)] hover:opacity-90 text-white font-bold py-2 sm:py-2 px-2 sm:px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch touch-target"
              >
                <span className="hidden sm:inline">Export </span>PDF
              </button>
              <button
                onClick={() => handleExport("png")}
                disabled={isExporting || imagesToPrint.length === 0}
                className="flex-1 flex items-center justify-center bg-[var(--accent-secondary)] hover:opacity-90 text-white font-bold py-2 sm:py-2 px-2 sm:px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch touch-target"
              >
                Export <span className="hidden sm:inline"> </span>PNG
              </button>
            </div>
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center pt-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] font-semibold transition-colors"
            >
              <BackIcon className="w-4 h-4 mr-1.5" />
              Back to Edit
            </button>
            <button
              onClick={onReset}
              className="w-full text-center text-sm text-[var(--text-secondary)] hover:text-red-500"
            >
              Start Over
            </button>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-2xl shadow-lg shadow-[var(--shadow-color)] p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
            Print Options
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Paper Size
              </label>
              <select
                value={paperType}
                onChange={(e) =>
                  setPaperType(e.target.value as "a4" | "custom")
                }
                className="w-full bg-[var(--control-bg)] border border-[var(--control-border)] rounded-md py-2 px-3 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition"
              >
                <option value="a4">A4 (210 x 297 mm)</option>
                <option value="custom">Custom</option>
              </select>
              {paperType === "custom" && (
                <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-[var(--control-bg)]/80 rounded-md border border-[var(--control-border)]">
                  <div>
                    <label
                      htmlFor="custom-width"
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                    >
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      id="custom-width"
                      value={customPaperSize.width}
                      onChange={(e) =>
                        setCustomPaperSize((p) => ({
                          ...p,
                          width: Number(e.target.value),
                        }))
                      }
                      min="1"
                      className="w-full bg-[var(--background-start-rgb)] border border-[var(--control-border)] rounded-md py-1 px-2 text-sm text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-height"
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                    >
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      id="custom-height"
                      value={customPaperSize.height}
                      onChange={(e) =>
                        setCustomPaperSize((p) => ({
                          ...p,
                          height: Number(e.target.value),
                        }))
                      }
                      min="1"
                      className="w-full bg-[var(--background-start-rgb)] border border-[var(--control-border)] rounded-md py-1 px-2 text-sm text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Paper Orientation
              </label>
              <div className="flex w-full bg-[var(--control-bg)] rounded-md p-1 border border-[var(--control-border)]">
                <button
                  onClick={() => setPaperOrientation("portrait")}
                  className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-colors ${paperOrientation === "portrait" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-black/5"}`}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setPaperOrientation("landscape")}
                  className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-colors ${paperOrientation === "landscape" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-black/5"}`}
                >
                  Landscape
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Margins (mm)
              </label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {(Object.keys(margins) as (keyof typeof margins)[]).map(
                  (side) => (
                    <div key={side}>
                      <label
                        htmlFor={`margin-${String(side)}`}
                        className="block text-xs font-medium text-[var(--text-tertiary)] mb-1 capitalize"
                      >
                        {String(side)}
                      </label>
                      <input
                        type="number"
                        id={`margin-${String(side)}`}
                        value={margins[side]}
                        onChange={(e) =>
                          handleMarginChange(side, e.target.value)
                        }
                        min="0"
                        className="w-full bg-[var(--background-start-rgb)] border border-[var(--control-border)] rounded-md py-1 px-2 text-sm text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {!isRandomSizeMode && (
                <div className="flex items-center justify-between bg-[var(--control-bg)]/80 p-3 rounded-lg">
                  <label
                    htmlFor="cut-marks-toggle"
                    className="text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Show Cut Marks
                  </label>
                  <button
                    id="cut-marks-toggle"
                    role="switch"
                    aria-checked={showCutMarks}
                    onClick={() => setShowCutMarks((p) => !p)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showCutMarks ? "bg-[var(--accent-primary)]" : "bg-[var(--control-border)]"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showCutMarks ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between bg-[var(--control-bg)]/80 p-3 rounded-lg">
                <label
                  htmlFor="no-gap-toggle"
                  className="text-sm font-medium text-[var(--text-secondary)]"
                >
                  No Gap Between Photos
                </label>
                <button
                  id="no-gap-toggle"
                  role="switch"
                  aria-checked={noGap}
                  onClick={() => setNoGap((p) => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${noGap ? "bg-[var(--accent-primary)]" : "bg-[var(--control-border)]"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${noGap ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>

            {!isRandomSizeMode && (
              <div>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mt-2 mb-2">
                  Photo Quantities
                </h3>
                <div className="text-center bg-[var(--control-bg)]/80 p-2 rounded-md mb-3 border border-[var(--control-border)]">
                  <span className="text-[var(--text-secondary)] text-sm">
                    Total on sheet:{" "}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {totalCount} / {Number(maxPhotos)}
                  </span>
                  <div className="mt-1 h-1.5 w-full bg-[var(--control-border)] rounded-full">
                    <div
                      className="bg-[var(--accent-primary)] h-1.5 rounded-full"
                      style={{
                        width: `${Number(maxPhotos) > 0 ? (totalCount / Number(maxPhotos)) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 -mr-2">
                  {images.map((image) => {
                    const quantity = quantities[image.id] || 0;
                    return (
                      <div
                        key={image.id}
                        className="bg-[var(--control-bg)]/80 p-3 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <img
                            src={image.dataUrl}
                            className="w-12 h-12 rounded object-cover"
                            alt="thumbnail"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-[var(--accent-primary)] w-8 text-center">
                              {quantity}
                            </span>
                            <button
                              onClick={() => handleRotateImage(image.id)}
                              title="Rotate 90°"
                              className="p-2 bg-[var(--control-bg)] hover:bg-[var(--control-border)] rounded-md transition-colors text-[var(--text-secondary)]"
                            >
                              <RotateCwIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <label
                          htmlFor={`quantity-${image.id}`}
                          className="sr-only"
                        >
                          Quantity for image
                        </label>
                        <input
                          id={`quantity-${image.id}`}
                          type="range"
                          min="0"
                          max={
                            Number(maxPhotos) > 0
                              ? (quantities[image.id] || 0) +
                                (Number(maxPhotos) - totalCount)
                              : 0
                          }
                          value={quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              image.id,
                              Number(e.target.value),
                            )
                          }
                          className="w-full h-2 mt-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                          disabled={Number(maxPhotos) === 0}
                          aria-label={`Quantity for image ${image.id}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleFillPage}
                  className="w-full mt-4 bg-[var(--control-bg)] hover:bg-[var(--control-border)] text-[var(--text-secondary)] font-bold py-2 px-4 rounded-lg transition-colors duration-200 active:scale-[0.98]"
                >
                  Optimize & Fill Page
                </button>
              </div>
            )}

            {isRandomSizeMode && (
              <div>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mt-2 mb-2">
                  Image Layout
                </h3>
                <div className="space-y-4 bg-[var(--control-bg)]/80 p-3 rounded-lg">
                  <div>
                    <label
                      htmlFor="scale-slider"
                      className="flex justify-between text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      <span>Scale Images</span>
                      <span className="font-bold text-[var(--accent-primary)]">
                        {Math.round(randomImageScale * 100)}%
                      </span>
                    </label>
                    <input
                      id="scale-slider"
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.05"
                      value={randomImageScale}
                      onChange={(e) =>
                        setRandomImageScale(Number(e.target.value))
                      }
                      className="w-full h-2 bg-black/10 dark:bg-black/20 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                      aria-label="Scale images for layout"
                    />
                  </div>
                </div>
                <div className="text-center bg-[var(--control-bg)]/80 p-3 rounded-md mt-4 border border-[var(--control-border)]">
                  <p className="font-semibold text-[var(--text-primary)] mt-1">
                    {imagesToPrint.length} images placed on{" "}
                    {paginatedLayout.length} sheet(s).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintLayout;
