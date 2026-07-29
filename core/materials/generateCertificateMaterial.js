import { renderFlyer } from "../pdf/renderFlyer.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

/**
 * Erzeugt aus einem bereits aufgelösten Urkunde-Materialtyp-Eintrag,
 * der zur Person passenden Template-Config (Auswahl nach Geschlecht
 * erfolgt VOR dem Aufruf, siehe `src/intern/generator.js`) ein
 * einzelnes Urkunde-PDF.
 *
 * Reine Orchestrierung um `core/pdf/renderFlyer.js` herum, analog zu
 * `generateFlyerMaterial.js` — einziger variabler Inhalt ist der
 * zusammengesetzte Name, keine Bild-Assets (kein Foto, keine QR-Codes).
 *
 * @param {object} params
 * @param {{key: string, label: string, category: string, format: string, extension: string, filename: string}} params.entry
 *   Der `CERTIFICATE_REPRESENTATIVE`-Eintrag aus `manifest.materials`.
 * @param {object} params.templateConfig Die zum Geschlecht der Person
 *   passende Template-Config (`certificateRepresentativeMaleTemplate`/
 *   `certificateRepresentativeFemaleTemplate`).
 * @param {{firstName: string, lastName: string}} params.person
 *   `manifest.person` — nur Vor- und Nachname werden benötigt.
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests.
 * @param {typeof renderFlyer} [params.deps.renderFlyer]
 * @returns {Promise<{key: string, label: string, category: string, format: string, extension: string, filename: string, mimeType: "application/pdf", content: Blob | Uint8Array, size: number, warnings: Array<object>}>}
 * @throws {Error} Bei fehlendem Dateinamen im Eintrag oder falschem Materialtyp.
 */
export async function generateCertificateMaterial({ entry, templateConfig, person, deps = {} } = {}) {
  if (!entry || typeof entry.filename !== "string" || entry.filename.trim() === "") {
    throw new Error(`generateCertificateMaterial: fehlender Dateiname für Materialtyp "${entry?.key}" im Manifest.`);
  }
  if (entry.key !== MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE) {
    throw new Error(`generateCertificateMaterial: "${entry.key}" ist kein Urkunde-Materialtyp.`);
  }
  if (!templateConfig) {
    throw new Error("generateCertificateMaterial: 'templateConfig' ist erforderlich.");
  }

  const { renderFlyer: renderFlyerFn = renderFlyer, ...renderDeps } = deps;

  const name = `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim();

  const { bytes, warnings } = await renderFlyerFn({
    templateConfig,
    textValues: { name },
    imageAssets: {},
    deps: renderDeps,
  });

  const content = typeof Blob !== "undefined" ? new Blob([bytes], { type: "application/pdf" }) : bytes;
  const size = typeof Blob !== "undefined" ? content.size : bytes.length;

  return {
    key: entry.key,
    label: entry.label,
    category: entry.category,
    format: entry.format,
    extension: entry.extension,
    filename: entry.filename,
    mimeType: "application/pdf",
    content,
    size,
    warnings,
  };
}
