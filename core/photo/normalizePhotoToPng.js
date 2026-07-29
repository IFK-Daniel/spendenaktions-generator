import { loadImage as defaultLoadImage } from "../branding/loadImage.js";

/**
 * Wandelt beliebige, vom Foto-Link-Endpunkt akzeptierte Bildformate
 * (siehe `core/photo/classifyPhotoFetchResponse.js` — jedes
 * `image/*`, also auch WebP/GIF/BMP/TIFF) über ein Browser-`<canvas>`
 * in PNG-Bytes um.
 *
 * Notwendig, weil `core/pdf/placeImage.js` (über pdf-lib) ausschließlich
 * PNG oder JPEG einbetten kann — mit dieser Normalisierung muss der
 * Flyer-Renderer selbst keine Formatfälle unterscheiden, unabhängig
 * davon, welches Format das jeweilige Foto ursprünglich hat.
 *
 * Reiner Browser-Code (nutzt `Image`/`canvas`, wie die bestehende
 * `core/branding/loadImage.js`/`drawLogoOnCanvas.js`) — nicht in Node
 * lauffähig.
 *
 * @param {object} params
 * @param {string} params.dataUrl Daten-URL des Quellbilds (z. B.
 *   `data:image/webp;base64,...`, wie von `fetchRepresentativePhoto`
 *   geliefert).
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests.
 * @param {typeof defaultLoadImage} [params.deps.loadImage]
 * @param {() => HTMLCanvasElement} [params.deps.createCanvas]
 * @returns {Promise<{bytes: Uint8Array, mimeType: "image/png"}>}
 * @throws {Error} Wenn das Bild nicht geladen werden kann.
 */
export async function normalizePhotoToPng({ dataUrl, deps = {} } = {}) {
  const { loadImage = defaultLoadImage, createCanvas = () => document.createElement("canvas") } = deps;

  const image = await loadImage(dataUrl);

  const canvas = createCanvas();
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  const pngDataUrl = canvas.toDataURL("image/png");
  const base64 = pngDataUrl.slice(pngDataUrl.indexOf(",") + 1);
  const bytes = base64ToUint8Array(base64);

  return { bytes, mimeType: "image/png" };
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
