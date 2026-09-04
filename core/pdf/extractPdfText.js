import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Extrahiert den TATSÄCHLICHEN Text (nicht nur Existenz/Seitengröße)
 * aus einem PDF — Node-Testwerkzeug (`pdfjs-dist`, devDependency), um
 * echte Text-/Glyphenkorruption zu erkennen, die reine "PDF lädt ohne
 * Exception"-Tests nicht auffangen.
 *
 * Hintergrund: `embedFont(bytes, { subset: true })` (pdf-lib/fontkit)
 * hat einen schweren Production-Bug verursacht — Namen, Telefon-
 * nummern und E-Mail-Adressen wurden auf einzelne Buchstaben reduziert
 * (z. B. "Daniel Feigenbutz" -> "b"), obwohl alle bisherigen
 * automatisierten Tests (PDF lädt, Seitengröße stimmt, keine Warnings)
 * weiterhin grün blieben. Diese Funktion ist die Grundlage der neuen
 * Text-Integritätstests (siehe `renderFlyer.test.js`,
 * `staticCompanionMaterialGuide.test.js`) — sie prüfen, dass konkret
 * erwarteter dynamischer Text (Name, Telefonnummer, E-Mail-Adresse)
 * tatsächlich vollständig im PDF steht, nicht nur, dass irgendein PDF
 * entstanden ist.
 *
 * @param {Uint8Array} pdfBytes
 * @returns {Promise<string[]>} Der extrahierte Text jeder Seite, in Seitenreihenfolge.
 */
export async function extractPdfText(pdfBytes) {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }

  return pages;
}
