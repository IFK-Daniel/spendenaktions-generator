import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Node-Variante: lädt eine einzelne Schriftdatei (URL, z. B.
 * `new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url)`)
 * von der Festplatte. Analog zu `loadTemplateAssets.js`, aber für
 * Aufrufer ohne Hintergrund-PDF (z. B.
 * `core/materials/generateCompanionMaterialGuide.js`, das frei fließenden
 * Text statt einer Template-Vorlage rendert).
 *
 * @param {URL} url
 * @returns {Uint8Array}
 */
export function loadFontFile(url) {
  return readFileSync(fileURLToPath(url));
}
