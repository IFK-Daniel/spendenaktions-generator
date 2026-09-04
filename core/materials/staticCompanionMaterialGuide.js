import { buildFileContent } from "./buildFileContent.js";
import {
  COMPANION_MATERIAL_GUIDE_FILENAME,
  COMPANION_MATERIAL_GUIDE_KEY,
  COMPANION_MATERIAL_GUIDE_LABEL,
} from "./generateCompanionMaterialGuide.js";

export const STATIC_GUIDE_URL = new URL(
  "../../assets/material-guide/Hinweise_zur_Verwendung_der_Materialien.pdf",
  import.meta.url
);

/**
 * Die Begleit-Anleitung „Hinweise zur Verwendung Deiner Materialien"
 * ist VOLLSTÄNDIG statisch (kein Name, keine IFK-ID, keine Kontakt-
 * daten, kein sonstiger personenbezogener Inhalt — siehe
 * `companionMaterialGuideContent.js`) und für jeden Wegbegleiter
 * identisch. Sie muss deshalb nicht bei jeder Materialerzeugung neu
 * gerendert werden: `generateCompanionMaterialGuide.js` bleibt als
 * Render-QUELLE für künftige inhaltliche Änderungen erhalten (Anpassung
 * an `companionMaterialGuideContent.js`, dann einmalig neu erzeugen —
 * siehe `scripts/regenerate-static-material-guide.mjs`), aber die
 * tatsächliche Produktivausgabe verwendet dieses einmal geprüfte,
 * statische PDF-Asset.
 *
 * Vorteile gegenüber Laufzeit-Rendering (siehe Vorgabe):
 * kein erneutes PDF-Rendering pro Person, kein Font-Risiko zur
 * Laufzeit (siehe der schwere `embedFont(..., { subset: true })`-Bug
 * in `core/pdf/renderFlyer.js`/`generateCompanionMaterialGuide.js`, der
 * genau diese Anleitung als eines von drei betroffenen Dokumenten
 * zerstört hatte — Test-/Beweisbilder in `artifacts/pdf-regression/`),
 * immer identischer, bereits visuell geprüfter Inhalt, einfach
 * austauschbar (Datei ersetzen), kleine/vorhersehbare Dateigröße.
 *
 * @param {object} [params]
 * @param {object} [params.deps]
 * @param {(url: URL) => Uint8Array | Promise<Uint8Array>} [params.deps.loadStaticBytes]
 *   PFLICHT: lädt die statische PDF-Datei zu Bytes — dieselben
 *   Node-/Browser-Loader wie für Schriftdateien
 *   (`core/pdf/loadFontFile.js`/`loadFontFileBrowser.js`) sind hier
 *   direkt wiederverwendbar (beide laden generisch Bytes von einer
 *   URL, unabhängig vom Dateityp).
 * @returns {Promise<{key: string, label: string, category: "guide", format: "pdf", extension: "pdf", filename: string, mimeType: "application/pdf", content: Blob | Uint8Array, size: number}>}
 * @throws {Error} Wenn `deps.loadStaticBytes` fehlt.
 */
export async function loadStaticCompanionMaterialGuide({ deps = {} } = {}) {
  if (typeof deps.loadStaticBytes !== "function") {
    throw new Error(
      "loadStaticCompanionMaterialGuide: 'deps.loadStaticBytes' ist erforderlich (z. B. loadFontFile.js in Node oder loadFontFileBrowser.js im Browser)."
    );
  }

  const bytes = await deps.loadStaticBytes(STATIC_GUIDE_URL);
  const { content, size } = buildFileContent(bytes, COMPANION_MATERIAL_GUIDE_FILENAME, "application/pdf");

  return {
    key: COMPANION_MATERIAL_GUIDE_KEY,
    label: COMPANION_MATERIAL_GUIDE_LABEL,
    category: "guide",
    format: "pdf",
    extension: "pdf",
    filename: COMPANION_MATERIAL_GUIDE_FILENAME,
    mimeType: "application/pdf",
    content,
    size,
  };
}
