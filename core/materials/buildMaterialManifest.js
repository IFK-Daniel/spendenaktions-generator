import { validateIfkId } from "../id/validateIfkId.js";
import { MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";
import { buildMaterialFilenames } from "./buildMaterialFilenames.js";

/**
 * Zulässige Werte für `gender`. Bewusst auf genau zwei Werte begrenzt,
 * kein Freitext — dient als Vorbereitung für die spätere
 * Flyer-Generierung (Repräsentant/Repräsentantin usw.), wird aktuell
 * von keiner Funktion ausgewertet.
 */
export const GENDER_VALUES = Object.freeze({
  MALE: "male",
  FEMALE: "female",
});

const VALID_GENDER_VALUES = new Set(Object.values(GENDER_VALUES));

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
 * @param {"male" | "female"} [params.gender] Optional. Wird, sofern
 *   angegeben, gegen `GENDER_VALUES` geprüft und unverändert im
 *   Manifest mitgeführt. Ohne Angabe enthält `person` kein
 *   `gender`-Feld (kein Default). Aktuell von keiner Funktion
 *   ausgewertet — reine Vorbereitung für eine künftige
 *   Flyer-Generierung.
 * @param {Array<string | {key: string}>} [params.materials]
 *   Siehe `buildMaterialFilenames`. Ohne Angabe werden alle sechs
 *   Materialtypen verwendet.
 * @returns {{
 *   version: number,
 *   person: { firstName: string, lastName: string, ifkId: string, gender?: "male" | "female" },
 *   materials: Array<{ key: string, label: string, category: string, format: string, extension: string, filename: string }>
 * }}
 * @throws {Error} Siehe `buildMaterialFilenames` (fehlender Name,
 *   ungültige IFK-ID, unbekannter Materialtyp) sowie bei ungültigem
 *   `gender`-Wert.
 */
export function buildMaterialManifest({ firstName, lastName, ifkId, gender, materials } = {}) {
  const filenameEntries = buildMaterialFilenames({ firstName, lastName, ifkId, materials });
  const normalizedIfkId = validateIfkId(ifkId).normalized;

  const person = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    ifkId: normalizedIfkId,
  };

  if (gender !== undefined) {
    if (!VALID_GENDER_VALUES.has(gender)) {
      throw new Error(`buildMaterialManifest: ungültiger Wert für 'gender' ("${gender}").`);
    }
    person.gender = gender;
  }

  return {
    version: 1,
    person,
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
