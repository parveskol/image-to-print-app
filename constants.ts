import { PassportSize } from './types';

export const PASSPORT_SIZES: PassportSize[] = [
  { name: 'India Passport (35x45 mm)', width_mm: 35, height_mm: 45 },
  { name: 'PAN Card (25x35 mm)', width_mm: 25, height_mm: 35 },
  { name: 'Stamp Size (20x25 mm)', width_mm: 20, height_mm: 25 },
  // A special entry to signify custom size selection in the UI
  { name: 'Custom Size', width_mm: 0, height_mm: 0 },
  // A special entry for variable size image packing
  { name: 'Random Size', width_mm: -1, height_mm: -1 },
];

export const A4_DIMENSIONS_MM = {
  width: 210,
  height: 297,
};

export const DPI = 300;