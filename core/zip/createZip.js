import JSZip from "jszip";

/**
 * Bündelt mehrere Dateien zu einem einzigen ZIP-Archiv.
 *
 * Reine, DOM-freie Datenverarbeitung: Es wird weder ein Download
 * ausgelöst noch eine Mail versendet — der Aufrufer entscheidet, was
 * mit dem zurückgegebenen Blob geschieht (z. B. `URL.createObjectURL`
 * für einen Download-Link, oder Weiterverarbeitung als Mail-Anhang).
 * Funktioniert unabhängig von einer konkreten App sowohl im Browser als
 * auch unter Node.js (z. B. für Tests oder serverseitige Nutzung).
 *
 * Unterstützte `content`-Datentypen je Datei:
 *   - `Blob`         — wird über `blob.arrayBuffer()` gelesen.
 *   - `ArrayBuffer`  — wird direkt übernommen.
 *   - `Uint8Array`   — wird direkt übernommen.
 *   - `string`, beginnend mit `"data:"` (Data-URL, z. B. wie von
 *     `core/qr/generateQr.js` erzeugt) — der Base64-Anteil nach dem
 *     Komma wird dekodiert und als Binärinhalt gespeichert.
 *   - `string`, jede andere Zeichenkette — wird unverändert als
 *     UTF-8-Textinhalt in die Datei geschrieben.
 *
 * Hinweis zu reinem Base64 ohne `data:`-Prefix: Ein solcher String ist
 * nicht von einem beliebigen Klartext-String unterscheidbar (z. B. wäre
 * der Text "Test" formal ebenfalls gültiges Base64). Um eine stille
 * Fehlinterpretation/Beschädigung von Textinhalten zu vermeiden, wird
 * reines Base64 daher bewusst NICHT automatisch erkannt. Binärinhalte
 * als Base64 müssen als Data-URL (`data:<mime-type>;base64,<daten>`)
 * übergeben werden.
 *
 * Verschachtelte Pfade (z. B. `"Logos/logo.svg"`) werden von der
 * zugrundeliegenden ZIP-Bibliothek automatisch als Ordnerstruktur im
 * Archiv angelegt. Dateinamen werden unverändert als Pfad im Archiv
 * verwendet.
 *
 * @param {object} params
 * @param {string} params.filename
 *   Name des Archivs, wie er unverändert im Rückgabewert erscheint.
 *   Diese Funktion hängt keine Dateiendung an und löst keinen Download
 *   aus — das bleibt Aufgabe der aufrufenden App.
 * @param {Array<{ filename: string, content: Blob | ArrayBuffer | Uint8Array | string }>} params.files
 *   Liste der zu bündelnden Dateien. Muss mindestens ein Element
 *   enthalten.
 * @returns {Promise<{ filename: string, blob: Blob, size: number }>}
 *
 * @throws {Error} Wenn `filename` fehlt/leer ist, `files` fehlt/leer
 *   ist, oder ein Eintrag in `files` keinen gültigen Dateinamen, keinen
 *   Inhalt oder einen nicht unterstützten Inhaltstyp hat.
 */
export async function createZip({ filename, files } = {}) {
  if (typeof filename !== "string" || filename.trim() === "") {
    throw new Error("createZip: 'filename' muss ein nicht-leerer String sein.");
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("createZip: 'files' darf nicht leer sein.");
  }

  const zip = new JSZip();

  for (let index = 0; index < files.length; index += 1) {
    const entry = files[index];

    if (entry === null || typeof entry !== "object") {
      throw new Error(`createZip: Eintrag ${index} ist kein gültiges Datei-Objekt.`);
    }

    const { filename: entryFilename, content } = entry;

    if (typeof entryFilename !== "string" || entryFilename.trim() === "") {
      throw new Error(`createZip: Eintrag ${index} hat keinen gültigen Dateinamen.`);
    }

    if (content === undefined || content === null) {
      throw new Error(`createZip: Datei "${entryFilename}" hat keinen Inhalt.`);
    }

    const normalizedContent = await normalizeContent(content, entryFilename);
    zip.file(entryFilename, normalizedContent);
  }

  const blob = await zip.generateAsync({ type: "blob" });

  return {
    filename,
    blob,
    size: blob.size,
  };
}

const DATA_URL_PATTERN = /^data:([^;]*);base64,(.*)$/s;

async function normalizeContent(content, entryFilename) {
  if (content instanceof Uint8Array) {
    return content;
  }

  if (content instanceof ArrayBuffer) {
    return content;
  }

  if (typeof Blob !== "undefined" && content instanceof Blob) {
    return new Uint8Array(await content.arrayBuffer());
  }

  if (typeof content === "string") {
    const dataUrlMatch = content.match(DATA_URL_PATTERN);
    if (dataUrlMatch) {
      return base64ToUint8Array(dataUrlMatch[2]);
    }
    return content;
  }

  throw new Error(
    `createZip: Inhalt von "${entryFilename}" hat einen nicht unterstützten Datentyp.`
  );
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
