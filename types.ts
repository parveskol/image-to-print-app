export enum Step {
  UPLOAD,
  CROP,
  PRINT,
}

export interface PassportSize {
  name: string;
  width_mm: number;
  height_mm: number;
}

export interface ProcessedImage {
  id: string;
  dataUrl: string;
  size: PassportSize;
  width_px?: number;
  height_px?: number;
  rotation?: 0 | 90;
}

export interface SheetMode {
  mode: 'standard' | 'random';
  size?: PassportSize;
}
