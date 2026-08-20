import { validateIfkId } from "../id/validateIfkId.js";
import { MATERIAL_TYPE_KEYS, MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";
import { buildMaterialList } from "./buildMaterialList.js";
import { FIELD_KEYS, getRequiredFieldsForMaterial } from "./materialRequirements.js";

/**
 * Dateinamens-Suffix je Materialtyp (ohne Präfix/Namen/Endung). Bewusst
 * getrennt von `materialTypes.js`, da es sich um eine reine
 * Benennungskonvention handelt, nicht um fachliche Metadaten des Typs.
 * Enthält bewusst KEINEN Eintrag für `CERTIFICATE_REPRESENTATIVE` — die
 * Urkunde folgt einem eigenen Schema, siehe `buildCertificateFilename()`.
 */
const FILENAME_SUFFIX_BY_KEY = Object.freeze({
  FLYER_DRUCKEREI: "Flyer_Druckerei",
  FLYER_HOME: "Flyer_Home",
  QR_PAYPAL_BLACK: "PayPal_QR_schwarz",
  QR_GIRO_BLACK: "GiroCode_schwarz",
});

const FILESYSTEM_UNSAFE_CHARS = /[\\/:*?"<>|]/g;

/**
 * Erzeugt die Dateinamen für die ausgewählten Materialien einer Person.
 *
 * Dateinamensschema: `IFK_<Vorname>_<Nachname>_<Materialsuffix>.<extension>`
 * — mit einer Ausnahme: die Repräsentantenurkunde
 * (`CERTIFICATE_REPRESENTATIVE`) folgt stattdessen dem Schema
 * `Urkunde_<Vorname>_<Nachname>.pdf` (siehe `buildCertificateFilename()`
 * unten). Die IFK-ID erscheint in keinem Dateinamen — sie wird
 * stattdessen (normalisiert) im Rückgabeobjekt mitgeführt.
 *
 * Die IFK-ID ist nur dann Pflicht (und wird geprüft), wenn mindestens
 * einer der ausgewählten Materialtypen sie laut `materialRequirements.js`
 * fachlich benötigt (aktuell: GiroCode schwarz sowie beide Flyer-
 * Varianten, siehe dort). Für materialauswahlen ohne diesen Bedarf
 * (z. B. ausschließlich die Repräsentantenurkunde oder ausschließlich
 * PayPal QR schwarz) bleibt eine fehlende oder ungültige IFK-ID
 * folgenlos — die zurückgegebenen Einträge enthalten dann kein `ifkId`.
 *
 * @param {object} params
 * @param {string} params.firstName Pflichtfeld, wird für den Dateinamen bereinigt.
 * @param {string} params.lastName Pflichtfeld, wird für den Dateinamen bereinigt.
 * @param {string} [params.ifkId] Pflicht, sofern mindestens ein
 *   ausgewählter Materialtyp die IFK-ID benötigt (siehe oben); muss dann
 *   laut `validateIfkId` gültig sein. Andernfalls optional.
 * @param {Array<string | {key: string}>} [params.materials]
 *   Die auszugebenden Materialien, als Liste von Schlüsseln oder
 *   Materialtyp-Objekten (z. B. das Ergebnis von `buildMaterialList()`).
 *   Ohne Angabe werden alle sechs Materialtypen verwendet.
 * @returns {Array<{key: string, label: string, filename: string, extension: string, ifkId?: string}>}
 * @throws {Error} Bei fehlendem Vor-/Nachnamen, unbekanntem Materialtyp
 *   oder — sofern von der Materialauswahl benötigt — fehlender/ungültiger
 *   IFK-ID.
 */
export function buildMaterialFilenames({ firstName, lastName, ifkId, materials } = {}) {
  const sanitizedFirstName = sanitizeNamePart(firstName, "firstName");
  const sanitizedLastName = sanitizeNamePart(lastName, "lastName");
  const resolvedMaterials = resolveMaterials(materials);
  const normalizedIfkId = resolveIfkId(ifkId, resolvedMaterials);

  return resolvedMaterials.map((type) => ({
    key: type.key,
    label: type.label,
    filename:
      type.key === MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE
        ? buildCertificateFilename(firstName, lastName)
        : `IFK_${sanitizedFirstName}_${sanitizedLastName}_${FILENAME_SUFFIX_BY_KEY[type.key]}.${type.extension}`,
    extension: type.extension,
    ifkId: normalizedIfkId,
  }));
}

/**
 * Dateinamensschema ausschließlich für die Repräsentantenurkunde:
 * `Urkunde_<Vorname>_<Nachname>.pdf` — bewusst ohne `IFK_`-Präfix und
 * ohne Materialsuffix am Ende (abweichend vom Schema der übrigen
 * Materialien, siehe oben), da die Urkunde ohne IFK-ID auskommt und
 * für sich alleine eindeutig benannt sein soll.
 *
 * Anders als `sanitizeNamePart()` werden deutsche Umlaute/ß hier
 * ZUSÄTZLICH transliteriert (ä→ae, ö→oe, ü→ue, ß→ss) statt im
 * Dateinamen zu verbleiben — ausschließlich für dieses Schema, die
 * übrigen Materialien behalten unverändert ihr bisheriges Verhalten
 * (siehe Test "Umlaute im Namen bleiben erhalten").
 */
function buildCertificateFilename(firstName, lastName) {
  const first = sanitizeCertificateNamePart(firstName, "firstName");
  const last = sanitizeCertificateNamePart(lastName, "lastName");
  return `Urkunde_${first}_${last}.pdf`;
}

function sanitizeCertificateNamePart(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`buildMaterialFilenames: '${fieldName}' ist erforderlich.`);
  }

  return transliterateGermanUmlauts(value.trim())
    .replace(FILESYSTEM_UNSAFE_CHARS, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const UMLAUT_TRANSLITERATIONS = Object.freeze({
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
});

function transliterateGermanUmlauts(value) {
  return value.replace(/[äöüÄÖÜß]/g, (char) => UMLAUT_TRANSLITERATIONS[char]);
}

/**
 * Ob mindestens einer der bereits aufgelösten Materialtypen die IFK-ID
 * fachlich benötigt (siehe `core/materials/materialRequirements.js`).
 */
function anyMaterialRequiresIfkId(resolvedMaterials) {
  return resolvedMaterials.some((type) => getRequiredFieldsForMaterial(type.key).includes(FIELD_KEYS.IFK_ID));
}

/**
 * Löst die IFK-ID auf: Pflicht (und geprüft) nur, wenn mindestens ein
 * ausgewählter Materialtyp sie benötigt — sonst wird eine fehlende oder
 * ungültige IFK-ID stillschweigend ignoriert (`undefined`), siehe
 * Modul-Dokumentation oben.
 */
function resolveIfkId(ifkId, resolvedMaterials) {
  if (!anyMaterialRequiresIfkId(resolvedMaterials)) {
    const result = validateIfkId(ifkId);
    return result.valid ? result.normalized : undefined;
  }

  const result = validateIfkId(ifkId);
  if (!result.valid) {
    throw new Error(`buildMaterialFilenames: ungültige IFK-ID (${result.reason}).`);
  }
  return result.normalized;
}

function resolveMaterials(materials) {
  const list = materials === undefined ? buildMaterialList() : materials;

  if (!Array.isArray(list)) {
    throw new Error("buildMaterialFilenames: 'materials' muss ein Array sein.");
  }

  return list.map((entry) => {
    const key = typeof entry === "string" ? entry : entry?.key;
    const type = MATERIAL_TYPES_BY_KEY[key];
    if (!type) {
      throw new Error(`buildMaterialFilenames: unbekannter Materialtyp "${key}".`);
    }
    return type;
  });
}

/**
 * Bereinigt einen Namensteil für die Verwendung in Dateinamen (siehe
 * oben). Exportiert, damit andere Module (z. B.
 * `buildMaterialZipFilename.js`) dieselbe Sanitizing-Logik
 * wiederverwenden können, statt sie zu duplizieren.
 */
export function sanitizeNamePart(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`buildMaterialFilenames: '${fieldName}' ist erforderlich.`);
  }

  return value
    .trim()
    .replace(FILESYSTEM_UNSAFE_CHARS, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
