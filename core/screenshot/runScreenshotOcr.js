import { repairPaypalUrlLine } from "./repairPaypalUrlLine.js";

// Vergrößerungen für die Zweitlesung der PayPal-URL. Die Lesungen weichen
// je nach Maßstab leicht ab; `pickPaypalReading` wählt/prüft sie.
const REGION_UPSCALES = [1, 2, 3];

/**
 * Liest die ausgewählte Datei selbst vollständig in den Speicher. Grund:
 * `tesseract.js` liest ein übergebenes `File`/`Blob` intern per
 * `FileReader` — in Safari scheitert das gelegentlich mit "File could not
 * be read! Code=0". Die Bytes selbst zu lesen (erst `Blob.arrayBuffer()`,
 * dann `FileReader` als Rückfall) und dem Worker diese zu übergeben,
 * umgeht das.
 */
async function readFileBytes(file) {
  if (typeof file.arrayBuffer === "function") {
    try {
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      // Rückfall auf FileReader
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Schneidet einen Bereich des Screenshots aus und vergrößert ihn — die
 * zweite, gezielte Lesung einer umgebrochenen PayPal-URL
 * (`repairPaypalUrlLine`) ist auf dem vergrößerten Ausschnitt deutlich
 * zeichengenauer. Reines Browser-Canvas, keine OffscreenCanvas-
 * Abhängigkeit (Safari).
 */
async function cropAndUpscale(file, rect, scale) {
  const bitmap = await createImageBitmap(file);
  try {
    const left = Math.max(0, Math.round(rect.left));
    const top = Math.max(0, Math.round(rect.top));
    const width = Math.max(1, Math.min(Math.round(rect.width), bitmap.width - left));
    const height = Math.max(1, Math.min(Math.round(rect.height), bitmap.height - top));
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, left, top, width, height, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas-Export fehlgeschlagen"))), "image/png")
    );
    // Als Bytes zurückgeben (nicht als Blob): tesseract.js liest ein Blob
    // per FileReader, was in Safari scheitern kann.
    return await readFileBytes(blob);
  } finally {
    bitmap.close?.();
  }
}

const CORE_PATH = "/tesseract/";
const WORKER_PATH = "/tesseract/worker.min.js";
const LANG_PATH = "/tesseract/lang-data";

/**
 * Führt die eigentliche OCR-Erkennung eines Screenshots im Browser
 * durch — die einzige Stelle im Projekt mit einer Abhängigkeit zu
 * `tesseract.js`. Bewusst als eigenes, ungetestetes Modul isoliert
 * (analog zu `core/branding/loadImage.js`, `core/photo/
 * fetchRepresentativePhoto.js`): reiner Browser-Aufruf ohne eigene
 * Fachlogik, die DOM-freie Auswertung liegt in
 * `core/screenshot/extractRawFieldsFromOcrLines.js`.
 *
 * `tesseract.js` wird ausschließlich hier per dynamischem Import
 * geladen, damit die OCR-Bibliothek nicht Teil des normalen
 * Materialgenerator-Bundles ist, sondern erst beim tatsächlichen
 * Öffnen eines Screenshots nachgeladen wird. Worker-Skript,
 * WASM-Kernmodule und deutsche Trainingsdaten werden über die eigene
 * Anwendung ausgeliefert (`public/tesseract/`, siehe
 * `scripts/copy-tesseract-assets.mjs`) statt von einem fremden CDN
 * geladen. Der Screenshot verlässt zu keinem Zeitpunkt den Browser.
 *
 * Liefert je Zeile zusätzlich die einzelnen erkannten Wörter mit
 * horizontaler Position (`x0`/`x1`) und Konfidenz — die humbee-Ansicht
 * zeigt rechts neben jedem Wert eigene Bedienelemente (Icons/Buttons),
 * die OCR gelegentlich als zusätzliche "Wörter" auf derselben Zeile
 * erkennt. Die Wortposition erlaubt es der DOM-freien Auswertung
 * (`core/screenshot/extractRawFieldsFromOcrLines.js`), solches
 * Rauschen anhand eines auffällig großen horizontalen Abstands vom
 * eigentlichen Wert zu erkennen und zu verwerfen — verlässlicher als
 * ein Konfidenzwert allein, da diese Bedienelemente von Tesseract oft
 * mit hoher Konfidenz (aber falschem Kontext) gelesen werden.
 *
 * Liefert je Wort zusätzlich die einzelnen erkannten Zeichen
 * (`symbols`) mit eigener Konfidenz. Tesseract berechnet die
 * Wort-Konfidenz nicht als reinen Durchschnitt der Zeichen-Konfidenzen,
 * sondern bezieht ein Sprachmodell mit ein — ein an sich korrekt (mit
 * hoher Einzelkonfidenz) gelesenes, aber unbekanntes/unplausibles Wort
 * (z. B. ein Teil einer PayPal-Vorgangs-ID) kann dadurch eine
 * niedrige Wort-Konfidenz erhalten, obwohl nur ein einzelnes Zeichen
 * tatsächlich unsicher war. Die Zeichenebene erlaubt es der
 * DOM-freien Auswertung (`core/screenshot/
 * annotateLowConfidenceCharacters.js`), genau dieses eine Zeichen statt
 * des gesamten Werts als unsicher zu markieren.
 *
 * Die vollständige Wort-Bounding-Box (`x0`/`y0`/`x1`/`y1`) wird
 * zusätzlich mitgeführt, damit die UI für prüfbedürftige Felder einen
 * vergrößerten Bildausschnitt der jeweiligen Originalzeile anzeigen
 * kann (`core/screenshot/computeCropRectangle.js`), statt nur des
 * erkannten Texts.
 *
 * @param {File | Blob} file
 * @returns {Promise<{ lines: { text: string, confidence: number, words: { text: string, confidence: number, x0: number, y0: number, x1: number, y1: number, symbols: { text: string, confidence: number }[] }[] }[] }>}
 */
export async function runScreenshotOcr(file) {
  const { createWorker, OEM, PSM } = await import("tesseract.js");

  const worker = await createWorker("deu", OEM.LSTM_ONLY, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: LANG_PATH,
  });

  try {
    const imageBytes = await readFileBytes(file);
    const { data } = await worker.recognize(imageBytes, {}, { blocks: true });

    const lines = (data.blocks || [])
      .flatMap((block) => block.paragraphs || [])
      .flatMap((paragraph) => paragraph.lines || [])
      .map((line) => ({
        text: (line.text || "").trim(),
        confidence: line.confidence,
        words: (line.words || []).map((word) => ({
          text: word.text,
          confidence: word.confidence,
          x0: word.bbox.x0,
          x1: word.bbox.x1,
          y0: word.bbox.y0,
          y1: word.bbox.y1,
          symbols: (word.symbols || []).map((symbol) => ({
            text: symbol.text,
            confidence: symbol.confidence,
          })),
        })),
      }))
      .filter((line) => line.text);

    // Nachbesserung: nur wenn im ersten Durchlauf kein PayPal-Link erkannt
    // wurde. Jeder Fehler hier lässt das bisherige Ergebnis unverändert.
    let repairedLines = lines;
    try {
      repairedLines = await repairPaypalUrlLine(lines, async (rect) => {
        const sourceBlob = new Blob([imageBytes], { type: file.type || "image/png" });
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
        const readings = [];
        for (const scale of REGION_UPSCALES) {
          const region = await cropAndUpscale(sourceBlob, rect, scale);
          const { data: regionData } = await worker.recognize(region);
          readings.push({ text: regionData.text, confidence: regionData.confidence });
        }
        return { readings };
      });
    } catch {
      repairedLines = lines;
    }

    return { lines: repairedLines };
  } finally {
    await worker.terminate();
  }
}
