import { generateQr as defaultGenerateQr } from "../qr/generateQr.js";

const DATA_URL_PATTERN = /^data:([^;]*);base64,(.*)$/s;

/**
 * Erzeugt aus einem bereits aufgelösten Materialtyp-Eintrag, einem
 * QR-Inhalt und einer Modulfarbe eine einzelne Datei.
 *
 * Reine Orchestrierung um das bestehende `core/qr/generateQr.js` herum:
 * erzeugt keinen eigenen QR-Code, sondern ruft ausschließlich die
 * bestehende Funktion auf und wandelt deren PNG-DataURL-Rückgabewert in
 * `{ content, size }` um (Blob, falls verfügbar, sonst Uint8Array).
 *
 * Der Dateiname wird unverändert aus `entry.filename` übernommen — hier
 * findet keine erneute Dateinamensbildung statt (siehe
 * `buildMaterialFilenames.js`/`buildMaterialManifest.js`).
 *
 * @param {object} params
 * @param {{key: string, label: string, category: string, format: string, extension: string, filename: string}} params.entry
 *   Ein einzelner Eintrag aus `manifest.materials`.
 * @param {string} params.content Der QR-Inhalt (PayPal-Link oder GiroCode-Payload).
 * @param {string} params.moduleColor QR-Modulfarbe (z. B. aus `core/config/colors.js`).
 * @param {*} params.logoImage Bereits geladenes Logo-Bild (siehe `core/branding/loadImage.js`).
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests.
 * @param {typeof defaultGenerateQr} [params.deps.generateQr] Ersatz für `core/qr/generateQr.js`.
 * @param {() => *} [params.deps.createCanvas] Liefert ein neues Canvas-Objekt
 *   (Standard: `document.createElement("canvas")`).
 * @returns {Promise<{key: string, label: string, category: string, format: string, extension: string, filename: string, mimeType: string, content: Blob | Uint8Array, size: number}>}
 * @throws {Error} Bei fehlendem Dateinamen im Eintrag oder leerem/unerwartetem Grafikinhalt.
 */
export async function generateMaterial({ entry, content, moduleColor, logoImage, deps = {} } = {}) {
  if (!entry || typeof entry.filename !== "string" || entry.filename.trim() === "") {
    throw new Error(`generateMaterial: fehlender Dateiname für Materialtyp "${entry?.key}" im Manifest.`);
  }

  const { generateQr: generateQrFn = defaultGenerateQr, createCanvas = defaultCreateCanvas } = deps;

  const canvas = createCanvas();
  const dataUrl = await generateQrFn(canvas, content, logoImage, moduleColor);
  const { content: fileContent, size } = dataUrlToFileContent(dataUrl, entry.key);

  return {
    key: entry.key,
    label: entry.label,
    category: entry.category,
    format: entry.format,
    extension: entry.extension,
    filename: entry.filename,
    mimeType: "image/png",
    content: fileContent,
    size,
  };
}

function defaultCreateCanvas() {
  return document.createElement("canvas");
}

function dataUrlToFileContent(dataUrl, key) {
  const match = typeof dataUrl === "string" ? dataUrl.match(DATA_URL_PATTERN) : null;
  if (!match) {
    throw new Error(`generateMaterial: unerwartetes Datenformat der erzeugten Grafik für "${key}".`);
  }

  const bytes = base64ToUint8Array(match[2]);
  if (bytes.length === 0) {
    throw new Error(`generateMaterial: erzeugte Datei für "${key}" ist leer.`);
  }

  const content = typeof Blob !== "undefined" ? new Blob([bytes], { type: "image/png" }) : bytes;
  const size = typeof Blob !== "undefined" ? content.size : bytes.length;
  return { content, size };
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
