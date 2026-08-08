import { PDFDocument } from "pdf-lib";
import { renderFlyer } from "./renderFlyer.js";

/**
 * Generische Mehrseiten-Orchestrierung: rendert mehrere Template-Configs
 * (je eine über den bestehenden, unverändert bleibenden `renderFlyer()`
 * aus `renderFlyer.js`) und fügt die entstandenen Einzelseiten-PDFs zu
 * EINEM mehrseitigen PDF zusammen (per `pdf-lib`s `copyPages`).
 *
 * Bewusst NICHT "Flyer"-spezifisch benannt oder implementiert — kennt
 * weder Vorder-/Rückseite noch Geschlecht, sondern nimmt eine beliebige
 * Liste von `{templateConfig, textValues?, imageAssets?}`-Einträgen
 * entgegen und reiht sie in genau dieser Reihenfolge als Seiten
 * aneinander. Andere mehrseitige Materialien (nicht nur der Flyer)
 * können dieselbe Funktion wiederverwenden.
 *
 * `renderFlyer()` selbst bleibt unverändert ein reiner Einzelseiten-
 * Renderer (siehe dortige Doku) — Aufrufer, die weiterhin genau eine
 * Seite benötigen (z. B. die Urkunde, siehe
 * `core/materials/generateCertificateMaterial.js`), rufen `renderFlyer()`
 * weiterhin direkt auf und werden von dieser Datei nicht berührt.
 *
 * @param {object} params
 * @param {Array<{templateConfig: object, textValues?: Record<string,string>, imageAssets?: Record<string,object>}>} params.pages
 *   Eine oder mehrere Seiten in Ausgabereihenfolge. Wirft bei leerem
 *   Array (mindestens eine Seite ist sinnvoll erforderlich).
 * @param {object} params.deps Siehe `renderFlyer()` — `deps.loadTemplateAssets`
 *   ist Pflicht und wird unverändert an jeden `renderFlyer()`-Aufruf
 *   durchgereicht (Node- oder Browser-Variante, je nach Laufzeitumgebung).
 * @returns {Promise<{bytes: Uint8Array, warnings: Array<{pageIndex: number, fieldKey: string, sizePt: number, minSizePt: number, reason: string}>}>}
 *   `warnings` sammelt die `warnings` jeder Einzelseite, jeweils um
 *   `pageIndex` ergänzt (Index in `params.pages`), damit die Aufrufer-
 *   Oberfläche weiterhin nachvollziehen kann, auf welcher Seite ein
 *   Feld nicht pixelgenau passte.
 * @throws {Error} Bei leerem `pages`-Array oder wenn ein einzelner
 *   `renderFlyer()`-Aufruf wirft (z. B. fehlendes Bild-Asset).
 */
export async function renderMultiPageDocument({ pages, deps } = {}) {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("renderMultiPageDocument: 'pages' muss ein Array mit mindestens einem Eintrag sein.");
  }

  const warnings = [];
  const singlePageDocs = [];

  for (const [pageIndex, pageSpec] of pages.entries()) {
    const { templateConfig, textValues = {}, imageAssets = {} } = pageSpec ?? {};
    const { bytes, warnings: pageWarnings } = await renderFlyer({
      templateConfig,
      textValues,
      imageAssets,
      deps,
    });
    for (const warning of pageWarnings) {
      warnings.push({ ...warning, pageIndex });
    }
    singlePageDocs.push(await PDFDocument.load(bytes));
  }

  const outDoc = await PDFDocument.create();
  for (const singlePageDoc of singlePageDocs) {
    const [copiedPage] = await outDoc.copyPages(singlePageDoc, [0]);
    outDoc.addPage(copiedPage);
  }

  const bytes = await outDoc.save();
  return { bytes, warnings };
}
