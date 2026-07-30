/**
 * Wandelt fertige Datei-Bytes in das `content`-Feld eines
 * Materialergebnisses um (siehe `generateFlyerMaterial.js`,
 * `generateCertificateMaterial.js`, `generateMaterial.js`).
 *
 * Erzeugt bewusst ein `File`-Objekt (nicht nur `Blob`) mit dem
 * vorgesehenen Dateinamen, sofern verfügbar: `File` erweitert `Blob`
 * vollständig kompatibel (`.size`, `.arrayBuffer()`, als
 * `URL.createObjectURL()`-Quelle nutzbar), trägt zusätzlich aber einen
 * Namen mit — Browser nutzen genau diesen Namen als Vorschlag, wenn
 * eine Object-URL ohne unser eigenes `download`-Attribut gespeichert
 * wird (z. B. über den nativen Speichern-Button des eingebetteten
 * PDF-Viewers nach "Vorschau in neuem Tab öffnen"). Ein reiner `Blob`
 * kennt keinen Namen — genau das führte zuvor zu vom Browser
 * generierten Fallback-Namen wie "Unknown.pdf". In Node (Tests,
 * fehlendes `File`) wird auf `Blob`, zuletzt auf die rohen Bytes
 * zurückgefallen.
 *
 * @param {Uint8Array} bytes
 * @param {string} filename
 * @param {string} mimeType
 * @returns {{content: File | Blob | Uint8Array, size: number}}
 */
export function buildFileContent(bytes, filename, mimeType) {
  if (typeof File !== "undefined") {
    const content = new File([bytes], filename, { type: mimeType });
    return { content, size: content.size };
  }
  if (typeof Blob !== "undefined") {
    const content = new Blob([bytes], { type: mimeType });
    return { content, size: content.size };
  }
  return { content: bytes, size: bytes.length };
}
