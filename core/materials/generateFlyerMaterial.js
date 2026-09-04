import { renderMultiPageDocument } from "../pdf/renderMultiPageDocument.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";
import { buildFileContent } from "./buildFileContent.js";
import { buildFlyerTextValues } from "./buildFlyerTextValues.js";

/**
 * Erzeugt aus einem bereits aufgelösten Flyer-Materialtyp-Eintrag, den
 * Template-Configs für Vorder- UND Rückseite sowie Foto-/QR-Bildbytes
 * ein einzelnes, zweiseitiges Flyer-PDF.
 *
 * Reine Orchestrierung um `core/pdf/renderMultiPageDocument.js` herum
 * (das seinerseits `renderFlyer.js` je Seite aufruft) — erzeugt selbst
 * keine Bild- oder Textinhalte, sondern übergibt nur bereits
 * vorliegende Daten (analog zu `generateMaterial.js` für QR-Codes,
 * das den bestehenden QR-Generator wiederverwendet statt einen
 * zweiten zu bauen).
 *
 * Diese Funktion liefert IMMER ein 2-seitiges PDF (Seite 1 =
 * Vorderseite mit den personalisierten Feldern, Seite 2 = die für alle
 * Wegbegleiter:innen gleiche, statische Rückseite) — es gibt keinen
 * separaten, einseitigen Flyer-Download mehr.
 *
 * Vorder- UND Rückseiten-Config werden bereits fertig aufgelöst
 * übergeben (siehe `resolveRepresentativeFlyerFrontTemplate` für die
 * Vorderseite je Geschlecht × Ansprache und `sharedFlyerBackTemplate`
 * für die eine gemeinsame Rückseite, beides in `src/intern/generator.js`
 * verdrahtet). Diese Funktion kennt weder Geschlecht noch Ansprache.
 *
 * Die beiden statischen Rückseiten-QR-Codes ("Partner werden"/"Mehr
 * erfahren") sind fester Bestandteil des Rückseiten-Artworks
 * (`templates/flyer-shared-back/`) — sie werden hier NICHT zusätzlich
 * gerendert, es gibt keine doppelten QR-Codes.
 *
 * @param {object} params
 * @param {{key: string, label: string, category: string, format: string, extension: string, filename: string}} params.entry
 *   Ein einzelner Flyer-Eintrag aus `manifest.materials`
 *   (`FLYER_DRUCKEREI` oder `FLYER_HOME`).
 * @param {object} params.templateConfig Die zum `entry.key`/Geschlecht
 *   passende Vorderseiten-Template-Config
 *   (`flyerPrintFrontTemplate`/`flyerHomeFrontTemplate`/…).
 * @param {object} params.backTemplateConfig Die gemeinsame Rückseiten-
 *   Template-Config (`sharedFlyerBackTemplate`) — rollen-, geschlechts-
 *   und ansprache-unabhängig, ein einziges Asset (siehe
 *   `templates/flyer-shared-back/template.config.js`).
 * @param {{firstName: string, lastName: string, region?: string, phone?: string, email?: string}} params.person
 *   `manifest.person` — die für den Flyer benötigten Felder müssen
 *   bereits vorab geprüft sein (siehe `assertFlyerPersonFieldsPresent`).
 * @param {{bytes: Uint8Array, mimeType: "image/png"|"image/jpeg"}} params.photoAsset
 *   Bereits geladenes, normalisiertes Foto (siehe
 *   `core/photo/normalizePhotoToPng.js`) — Pflicht für Flyer-Materialien.
 * @param {{bytes: Uint8Array, mimeType: "image/png"}} params.qrPaypalAsset
 *   Bereits erzeugter PayPal-QR (aus `generateMaterial.js`/`generateQrMaterials.js`,
 *   ausschließlich die schwarze Variante mit grünem Logo — siehe
 *   `materialTypes.js`).
 * @param {{bytes: Uint8Array, mimeType: "image/png"}} params.qrGiroAsset
 *   Bereits erzeugter GiroCode (aus `generateMaterial.js`/`generateQrMaterials.js`,
 *   ausschließlich die schwarze Variante mit grünem Logo).
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests.
 * @param {typeof renderMultiPageDocument} [params.deps.renderMultiPageDocument]
 * @returns {Promise<{key: string, label: string, category: string, format: string, extension: string, filename: string, mimeType: "application/pdf", content: Blob | Uint8Array, size: number, warnings: Array<object>}>}
 * @throws {Error} Bei fehlendem Dateinamen im Eintrag, fehlendem
 *   Foto-Asset oder fehlenden QR-Assets.
 */
export async function generateFlyerMaterial({
  entry,
  templateConfig,
  backTemplateConfig,
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

  const { renderMultiPageDocument: renderMultiPageDocumentFn = renderMultiPageDocument, ...renderDeps } = deps;

  const { bytes, warnings } = await renderMultiPageDocumentFn({
    pages: [
      {
        templateConfig,
        textValues: buildFlyerTextValues(person, templateConfig),
        imageAssets: {
          photo: photoAsset,
          qrPaypal: qrPaypalAsset,
          qrGiro: qrGiroAsset,
        },
      },
      {
        templateConfig: backTemplateConfig,
      },
    ],
    deps: renderDeps,
  });

  const { content, size } = buildFileContent(bytes, entry.filename, "application/pdf");

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
