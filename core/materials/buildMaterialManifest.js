import { validateIfkId } from "../id/validateIfkId.js";
import { MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";
import { buildMaterialFilenames } from "./buildMaterialFilenames.js";

/**
 * Baut aus Materialauswahl und Dateinamen ein vollständiges, rein
 * fachliches Manifest der für eine Person zu erzeugenden individuellen
 * Materialien.
 *
 * Enthält bewusst ausschließlich die Beschreibung, WAS erzeugt werden
 * soll (Schlüssel, Bezeichnung, Kategorie, Format, Dateiname) — keine
 * Dateiinhalte, Blob-Daten, URLs, Mail- oder ZIP-Daten. Die eigentliche
 * Erzeugung, Bündelung und der Versand sind bewusst nicht Teil dieses
 * Moduls (siehe `core/qr`, `core/zip`, `core/mail`).
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.ifkId
 * @param {Array<string | {key: string}>} [params.materials]
 *   Siehe `buildMaterialFilenames`. Ohne Angabe werden alle sechs
 *   Materialtypen verwendet.
 * @returns {{
 *   version: number,
 *   person: { firstName: string, lastName: string, ifkId: string },
 *   materials: Array<{ key: string, label: string, category: string, format: string, extension: string, filename: string }>
 * }}
 * @throws {Error} Siehe `buildMaterialFilenames` (fehlender Name,
 *   ungültige IFK-ID, unbekannter Materialtyp).
 */
export function buildMaterialManifest({ firstName, lastName, ifkId, materials } = {}) {
  const filenameEntries = buildMaterialFilenames({ firstName, lastName, ifkId, materials });
  const normalizedIfkId = validateIfkId(ifkId).normalized;

  return {
    version: 1,
    person: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ifkId: normalizedIfkId,
    },
    materials: filenameEntries.map((entry) => {
      const type = MATERIAL_TYPES_BY_KEY[entry.key];
      return {
        key: entry.key,
        label: entry.label,
        category: type.category,
        format: type.format,
        extension: entry.extension,
        filename: entry.filename,
      };
    }),
  };
}
