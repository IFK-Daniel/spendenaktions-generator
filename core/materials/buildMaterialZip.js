import { createZip } from "../zip/createZip.js";
import { buildMaterialZipFilename } from "./buildMaterialZipFilename.js";

/**
 * Bündelt die tatsächlich erzeugten Materialdateien (Rückgabe von
 * `generateQrMaterials()`) zu genau einem ZIP-Archiv für den Versand
 * an den Repräsentanten. Reine Orchestrierung — nutzt ausschließlich
 * den bestehenden `core/zip/createZip.js` sowie
 * `buildMaterialZipFilename.js` für den Dateinamen, keine eigene
 * ZIP-Implementierung.
 *
 * @param {object} params
 * @param {string} params.ifkId
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {Array<{ filename: string, content: Blob | ArrayBuffer | Uint8Array | string }>} params.files
 *   Die tatsächlich erzeugten Materialdateien, z. B. das Ergebnis von
 *   `generateQrMaterials()`. Muss mindestens eine Datei enthalten.
 * @returns {Promise<{ filename: string, blob: Blob, size: number }>}
 * @throws {Error} Bei ungültiger IFK-ID, fehlendem Vor-/Nachnamen oder
 *   leerer/fehlender Dateiliste (siehe `createZip.js`).
 */
export async function buildMaterialZip({ ifkId, firstName, lastName, files } = {}) {
  const filename = buildMaterialZipFilename({ ifkId, firstName, lastName });

  return createZip({
    filename,
    files: (files ?? []).map((file) => ({ filename: file.filename, content: file.content })),
  });
}
