import { renderFlyer } from "../pdf/renderFlyer.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

/**
 * Bildet `manifest.person`-Felder auf die generischen `textValues`-
 * Feldschlüssel der Flyer-Template-Configs ab (siehe
 * `templates/*​/template.config.js`, Abschnitt `fields`). Bewusst hier
 * zentralisiert (statt im UI-Code verteilt) — die einzige Stelle, die
 * weiß, dass der Flyer intern zwei Textfelder für den Regionsnamen hat
 * (Kopfzeile + Fließtext, siehe Template-Config-Kommentar).
 *
 * @param {{firstName: string, lastName: string, region?: string, phone?: string, email?: string}} person
 * @returns {Record<string, string>}
 */
function buildFlyerTextValues(person) {
  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return {
    name,
    region: person.region ?? "",
    regionInParagraph: person.region ?? "",
    phone: person.phone ?? "",
    email: person.email ?? "",
  };
}

/**
 * Erzeugt aus einem bereits aufgelösten Flyer-Materialtyp-Eintrag, der
 * zugehörigen Template-Config sowie Foto-/QR-Bildbytes ein einzelnes
 * Flyer-PDF.
 *
 * Reine Orchestrierung um `core/pdf/renderFlyer.js` herum — erzeugt
 * selbst keine Bild- oder Textinhalte, sondern übergibt nur bereits
 * vorliegende Daten (analog zu `generateMaterial.js` für QR-Codes,
 * das den bestehenden QR-Generator wiederverwendet statt einen
 * zweiten zu bauen).
 *
 * @param {object} params
 * @param {{key: string, label: string, category: string, format: string, extension: string, filename: string}} params.entry
 *   Ein einzelner Flyer-Eintrag aus `manifest.materials`
 *   (`FLYER_DRUCKEREI` oder `FLYER_HOME`).
 * @param {object} params.templateConfig Die zum `entry.key` passende
 *   Template-Config (`flyerPrintFrontTemplate`/`flyerHomeFrontTemplate`).
 * @param {{firstName: string, lastName: string, region?: string, phone?: string, email?: string}} params.person
 *   `manifest.person` — die für den Flyer benötigten Felder müssen
 *   bereits vorab geprüft sein (siehe `assertFlyerPersonFieldsPresent`).
 * @param {{bytes: Uint8Array, mimeType: "image/png"|"image/jpeg"}} params.photoAsset
 *   Bereits geladenes, normalisiertes Foto (siehe
 *   `core/photo/normalizePhotoToPng.js`) — Pflicht für Flyer-Materialien.
 * @param {{bytes: Uint8Array, mimeType: "image/png"}} params.qrPaypalAsset
 *   Bereits erzeugter PayPal-QR (aus `generateMaterial.js`/`generateQrMaterials.js`).
 * @param {{bytes: Uint8Array, mimeType: "image/png"}} params.qrGiroAsset
 *   Bereits erzeugter GiroCode (aus `generateMaterial.js`/`generateQrMaterials.js`).
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests.
 * @param {typeof renderFlyer} [params.deps.renderFlyer]
 * @returns {Promise<{key: string, label: string, category: string, format: string, extension: string, filename: string, mimeType: "application/pdf", content: Blob | Uint8Array, size: number, warnings: Array<object>}>}
 * @throws {Error} Bei fehlendem Dateinamen im Eintrag, fehlendem
 *   Foto-Asset oder fehlenden QR-Assets.
 */
export async function generateFlyerMaterial({
  entry,
  templateConfig,
  person,
  photoAsset,
  qrPaypalAsset,
  qrGiroAsset,
  deps = {},
} = {}) {
  if (!entry || typeof entry.filename !== "string" || entry.filename.trim() === "") {
    throw new Error(`generateFlyerMaterial: fehlender Dateiname für Materialtyp "${entry?.key}" im Manifest.`);
  }
  if (entry.key !== MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI && entry.key !== MATERIAL_TYPE_KEYS.FLYER_HOME) {
    throw new Error(`generateFlyerMaterial: "${entry.key}" ist kein Flyer-Materialtyp.`);
  }
  if (!photoAsset) {
    throw new Error("generateFlyerMaterial: 'photoAsset' ist für Flyer-Materialien erforderlich.");
  }
  if (!qrPaypalAsset || !qrGiroAsset) {
    throw new Error("generateFlyerMaterial: 'qrPaypalAsset' und 'qrGiroAsset' sind für Flyer-Materialien erforderlich.");
  }

  const { renderFlyer: renderFlyerFn = renderFlyer, ...renderDeps } = deps;

  const { bytes, warnings } = await renderFlyerFn({
    templateConfig,
    textValues: buildFlyerTextValues(person),
    imageAssets: {
      photo: photoAsset,
      qrPaypal: qrPaypalAsset,
      qrGiro: qrGiroAsset,
    },
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
