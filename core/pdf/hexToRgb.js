import { rgb } from "pdf-lib";

/**
 * Wandelt eine Hex-Farbe (`#RRGGBB` oder `RRGGBB`) in eine pdf-lib
 * `rgb(...)`-Farbe um.
 *
 * @param {string} hex
 * @returns {import("pdf-lib").RGB}
 * @throws {Error} Bei ungültigem Hex-Format.
 */
export function hexToRgb(hex) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex ?? "");
  if (!match) {
    throw new Error(`hexToRgb: ungültige Hex-Farbe "${hex}".`);
  }
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}
