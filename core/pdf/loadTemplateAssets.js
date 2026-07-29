import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Lädt die Dateien, auf die eine Template-Config verweist (Hintergrund-
 * PDF, Schriftdateien), von der Festplatte. Einziger Ort im
 * `core/pdf`-Modul, der Dateisystemzugriff kapselt — alle anderen
 * Funktionen arbeiten ausschließlich mit bereits geladenen Bytes/Werten
 * und sind dadurch ohne echte Dateien testbar.
 *
 * @param {object} templateConfig Siehe `templates/*​/template.config.js`.
 * @returns {{
 *   backgroundBytes: Uint8Array,
 *   fonts: Record<string, { type: "standard", name: string } | { type: "file", bytes: Uint8Array }>
 * }}
 */
export function loadTemplateAssets(templateConfig) {
  const backgroundBytes = readFileSync(fileURLToPath(templateConfig.background));

  const fonts = {};
  for (const [fontKey, fontConfig] of Object.entries(templateConfig.fonts)) {
    if (fontConfig.type === "file") {
      fonts[fontKey] = { type: "file", bytes: readFileSync(fileURLToPath(fontConfig.path)) };
    } else if (fontConfig.type === "standard") {
      fonts[fontKey] = { type: "standard", name: fontConfig.name };
    } else {
      throw new Error(`loadTemplateAssets: unbekannter Font-Typ "${fontConfig.type}" für Font "${fontKey}".`);
    }
  }

  return { backgroundBytes, fonts };
}
