import { validateIfkId } from "../id/validateIfkId.js";
import { extractPaypalLink } from "../text/extractPaypalLink.js";
import { buildGirocodePayload } from "../girocode/buildGirocodePayload.js";
import { loadImage as defaultLoadImage } from "../branding/loadImage.js";
import { QR_COLOR_GRUEN, QR_COLOR_SCHWARZ } from "../config/colors.js";
import { GIROCODE_DEFAULTS } from "../config/girocodeDefaults.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";
import { generateMaterial } from "./generateMaterial.js";

const PAYPAL_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN, MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK]);
const GIRO_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_GIRO_GREEN, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK]);
const HANDLED_QR_KEYS = new Set([...PAYPAL_KEYS, ...GIRO_KEYS]);

const COLOR_BY_KEY = Object.freeze({
  [MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN]: QR_COLOR_GRUEN,
  [MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK]: QR_COLOR_SCHWARZ,
  [MATERIAL_TYPE_KEYS.QR_GIRO_GREEN]: QR_COLOR_GRUEN,
  [MATERIAL_TYPE_KEYS.QR_GIRO_BLACK]: QR_COLOR_SCHWARZ,
});

/**
 * Erzeugt die vier individuellen QR-Materialien (PayPal QR grün/schwarz,
 * GiroCode grün/schwarz) aus einem Materialmanifest.
 *
 * Reine Orchestrierung über bestehenden Core-Modulen — es wird weder
 * QR-/GiroCode-/Branding-Logik dupliziert noch neu implementiert:
 * `core/qr/generateQr.js` (über `generateMaterial.js`), `core/girocode/
 * buildGirocodePayload.js`, `core/branding/loadImage.js`,
 * `core/config/colors.js` und `core/config/girocodeDefaults.js` werden
 * direkt wiederverwendet. Flyer-Einträge im Manifest werden ignoriert
 * und führen nicht zu einem Fehler; enthält das Manifest ausschließlich
 * Flyer, wird ein leeres Array zurückgegeben.
 *
 * @param {object} params
 * @param {{
 *   person: { firstName: string, lastName: string, ifkId: string },
 *   materials: Array<{ key: string, label: string, category: string, format: string, extension: string, filename: string }>
 * }} params.manifest Ein von `buildMaterialManifest()` erzeugtes Manifest.
 * @param {string} [params.paypalUrl] Pflicht, sobald mindestens ein
 *   PayPal-Material im Manifest enthalten ist. Wird über die bestehende
 *   `extractPaypalLink`-Logik geprüft (keine neue Validierung).
 * @param {{ empfaenger?: string, iban?: string, bic?: string }} [params.girocode]
 *   Pflicht, sobald mindestens ein GiroCode-Material im Manifest
 *   enthalten ist. Fehlende Felder werden aus
 *   `core/config/girocodeDefaults.js` ergänzt. `betrag` bleibt immer
 *   leer, `verwendungszweck` ist immer `"<IFK-ID> Spende"` — abweichende
 *   Werte in diesem Parameter werden ignoriert.
 * @param {string} params.logo Bildquelle für `core/branding/loadImage.js`
 *   (analog zum bestehenden öffentlichen QR-Code-Generator).
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests
 *   (Produktionsverhalten bleibt bei Standardwerten unverändert).
 * @param {typeof defaultLoadImage} [params.deps.loadImage]
 * @param {Function} [params.deps.generateQr] Siehe `generateMaterial.js`.
 * @param {() => *} [params.deps.createCanvas] Siehe `generateMaterial.js`.
 * @returns {Promise<Array<{key: string, label: string, category: string, format: string, extension: string, filename: string, mimeType: string, content: Blob | Uint8Array, size: number}>>}
 * @throws {Error} Bei ungültigem/fehlendem Manifest, ungültiger IFK-ID,
 *   fehlendem/ungültigem PayPal-Link (wenn benötigt), fehlenden
 *   GiroCode-Daten (wenn benötigt), fehlendem/nicht ladbarem Logo,
 *   unbekanntem QR-Materialtyp oder fehlendem Dateinamen im Manifest.
 */
export async function generateQrMaterials({ manifest, paypalUrl, girocode, logo, deps = {} } = {}) {
  assertValidManifest(manifest);
  const ifkId = assertValidIfkId(manifest.person.ifkId);
  const materialsToGenerate = resolveQrMaterials(manifest.materials);

  if (materialsToGenerate.length === 0) {
    return [];
  }

  assertFilenamesPresent(materialsToGenerate);

  const needsPaypal = materialsToGenerate.some((entry) => PAYPAL_KEYS.has(entry.key));
  const needsGiro = materialsToGenerate.some((entry) => GIRO_KEYS.has(entry.key));

  const validatedPaypalUrl = needsPaypal ? assertValidPaypalUrl(paypalUrl) : null;
  const girocodePayload = needsGiro ? buildGirocodeContent(girocode, ifkId) : null;

  const { loadImage: loadImageFn = defaultLoadImage, ...materialDeps } = deps;
  const logoImage = await loadLogoOrThrow(logo, loadImageFn);

  const results = [];
  for (const entry of materialsToGenerate) {
    const content = PAYPAL_KEYS.has(entry.key) ? validatedPaypalUrl : girocodePayload;
    const moduleColor = COLOR_BY_KEY[entry.key];
    const file = await generateMaterial({ entry, content, moduleColor, logoImage, deps: materialDeps });
    results.push(file);
  }

  return results;
}

function assertValidManifest(manifest) {
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !manifest.person ||
    typeof manifest.person !== "object" ||
    !Array.isArray(manifest.materials)
  ) {
    throw new Error(
      "generateQrMaterials: 'manifest' ist erforderlich und muss dem Format von buildMaterialManifest() entsprechen."
    );
  }
}

function assertValidIfkId(ifkId) {
  const result = validateIfkId(ifkId);
  if (!result.valid) {
    throw new Error(`generateQrMaterials: ungültige IFK-ID im Manifest (${result.reason}).`);
  }
  return result.normalized;
}

function resolveQrMaterials(materials) {
  const result = [];
  for (const entry of materials) {
    if (!entry || typeof entry !== "object" || typeof entry.key !== "string") {
      throw new Error("generateQrMaterials: ungültiger Material-Eintrag im Manifest.");
    }
    if (HANDLED_QR_KEYS.has(entry.key)) {
      result.push(entry);
    } else if (entry.category === "flyer") {
      // Flyer werden aktuell nicht erzeugt und führen bewusst zu keinem Fehler.
    } else {
      throw new Error(`generateQrMaterials: unbekannter QR-Materialtyp "${entry.key}".`);
    }
  }
  return result;
}

function assertFilenamesPresent(entries) {
  for (const entry of entries) {
    if (typeof entry.filename !== "string" || entry.filename.trim() === "") {
      throw new Error(`generateQrMaterials: fehlender Dateiname für Materialtyp "${entry.key}" im Manifest.`);
    }
  }
}

function assertValidPaypalUrl(paypalUrl) {
  if (typeof paypalUrl !== "string" || paypalUrl.trim() === "") {
    throw new Error("generateQrMaterials: 'paypalUrl' ist erforderlich, wenn PayPal-Materialien ausgewählt sind.");
  }

  const trimmed = paypalUrl.trim();
  const extracted = extractPaypalLink(trimmed);
  if (!extracted || extracted !== trimmed) {
    throw new Error("generateQrMaterials: 'paypalUrl' ist kein gültiger PayPal-Link.");
  }
  return extracted;
}

function buildGirocodeContent(girocode, ifkId) {
  if (!girocode || typeof girocode !== "object") {
    throw new Error("generateQrMaterials: 'girocode' ist erforderlich, wenn GiroCode-Materialien ausgewählt sind.");
  }

  const empfaenger = girocode.empfaenger ?? GIROCODE_DEFAULTS.empfaenger;
  const iban = girocode.iban ?? GIROCODE_DEFAULTS.iban;
  const bic = girocode.bic ?? GIROCODE_DEFAULTS.bic;

  if (!empfaenger || !iban) {
    throw new Error("generateQrMaterials: 'girocode' benötigt mindestens 'empfaenger' und 'iban'.");
  }

  return buildGirocodePayload({
    empfaenger,
    iban,
    bic,
    betrag: "",
    verwendungszweck: `${ifkId} Spende`,
  });
}

async function loadLogoOrThrow(logo, loadImageFn) {
  if (logo === undefined || logo === null || logo === "") {
    throw new Error("generateQrMaterials: 'logo' ist erforderlich.");
  }
  try {
    return await loadImageFn(logo);
  } catch {
    throw new Error("generateQrMaterials: Logo konnte nicht geladen werden.");
  }
}
