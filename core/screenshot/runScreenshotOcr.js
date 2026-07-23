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
 * @param {File | Blob} file
 * @returns {Promise<{ lines: { text: string, confidence: number, words: { text: string, confidence: number, x0: number, x1: number, symbols: { text: string, confidence: number }[] }[] }[] }>}
 */
export async function runScreenshotOcr(file) {
  const { createWorker, OEM } = await import("tesseract.js");

  const worker = await createWorker("deu", OEM.LSTM_ONLY, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: LANG_PATH,
  });

  try {
    const { data } = await worker.recognize(file, {}, { blocks: true });

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
          symbols: (word.symbols || []).map((symbol) => ({
            text: symbol.text,
            confidence: symbol.confidence,
          })),
        })),
      }))
      .filter((line) => line.text);

    return { lines };
  } finally {
    await worker.terminate();
  }
}
