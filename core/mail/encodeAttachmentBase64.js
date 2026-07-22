/**
 * Kodiert einen Dateiinhalt (Blob, ArrayBuffer oder Uint8Array — wie er
 * z. B. von `core/materials/generateMaterial.js` oder
 * `core/zip/createZip.js` zurückgegeben wird) als reinen Base64-String
 * für den Versand als JSON-Payload an eine serverseitige Mailfunktion.
 *
 * Eigenständige, kleine Umwandlung für den Mail-Transport — keine
 * Kopie der ZIP-Inhaltsnormalisierung aus `core/zip/createZip.js`, da
 * dort Binärdaten (Uint8Array) und hier ein Base64-String das Ziel
 * ist.
 *
 * @param {Blob | ArrayBuffer | Uint8Array} content
 * @returns {Promise<string>}
 * @throws {Error} Bei nicht unterstütztem Inhaltstyp.
 */
export async function encodeAttachmentBase64(content) {
  const bytes = await toUint8Array(content);

  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function toUint8Array(content) {
  if (content instanceof Uint8Array) {
    return content;
  }

  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }

  if (typeof Blob !== "undefined" && content instanceof Blob) {
    return new Uint8Array(await content.arrayBuffer());
  }

  throw new Error("encodeAttachmentBase64: nicht unterstützter Inhaltstyp.");
}
