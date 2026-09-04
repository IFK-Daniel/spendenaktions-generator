import { loadImage as defaultLoadImage } from "../branding/loadImage.js";

// Zielfläche des Fotos im Flyer ist ein Kreis von ca. 32mm Durchmesser
// (siehe `templates/_shared/representativeFlyerFrontBase.js`: 31.195mm;
// `templates/flyer-print-front/template.config.js`: 31.9mm) — bei
// 300dpi Druckauflösung entspricht das rund 378px. Der Fotoausschnitt-
// Editor erlaubt zusätzlich manuelles Hineinzoomen bis Faktor 3
// (`core/pdf/photoCrop.js`, `PHOTO_CROP_MAX_ZOOM`); bei maximalem Zoom
// werden pro Zielpixel entsprechend mehr Quellpixel benötigt, deshalb
// bezieht sich die Zielauflösung auf den ungünstigsten Fall
// (378px × 3 ≈ 1134px) statt auf die unskalierte Zielgröße. 1600px
// liegt komfortabel darüber und deckt zusätzlich beide Ausgabeformate
// (Druckerei UND Home nutzen dasselbe Foto-Asset) ohne sichtbaren
// Qualitätsverlust ab.
const MAX_PHOTO_DIMENSION_PX = 1600;
const PHOTO_JPEG_QUALITY = 0.88;

/**
 * Wandelt beliebige, vom Foto-Link-Endpunkt akzeptierte Bildformate
 * (siehe `core/photo/classifyPhotoFetchResponse.js` — jedes
 * `image/*`, also auch WebP/GIF/BMP/TIFF) über ein Browser-`<canvas>`
 * in ein für den Flyer-Druck angemessen aufgelöstes JPEG um.
 *
 * Notwendig, weil `core/pdf/placeImage.js` (über pdf-lib) ausschließlich
 * PNG oder JPEG einbetten kann — mit dieser Normalisierung muss der
 * Flyer-Renderer selbst keine Formatfälle unterscheiden, unabhängig
 * davon, welches Format das jeweilige Foto ursprünglich hat.
 *
 * Skaliert zusätzlich auf `MAX_PHOTO_DIMENSION_PX` herunter (nie hoch)
 * und kodiert als JPEG statt PNG: das eingebettete Foto wird nur in
 * einem kleinen Kreis (≤ 32mm) dargestellt (siehe `placeImage.js` —
 * Kreisausschnitt per Vektor-Clip, kein Alphakanal nötig), ein
 * unverändertes, ggf. mehrere Megapixel großes Originalfoto als
 * verlustfreies PNG einzubetten vervielfacht die PDF-Größe ohne
 * sichtbaren Gewinn. Weißer Hintergrund vor dem Zeichnen verhindert,
 * dass eine evtl. vorhandene PNG-Transparenz beim Kodieren als JPEG zu
 * schwarzen Flächen wird.
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
 * @returns {Promise<{bytes: Uint8Array, mimeType: "image/jpeg"}>}
 * @throws {Error} Wenn das Bild nicht geladen werden kann.
 */
export async function normalizePhotoToPng({ dataUrl, deps = {} } = {}) {
  const { loadImage = defaultLoadImage, createCanvas = () => document.createElement("canvas") } = deps;

  const image = await loadImage(dataUrl);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const downscale = Math.min(1, MAX_PHOTO_DIMENSION_PX / Math.max(sourceWidth, sourceHeight));

  const canvas = createCanvas();
  canvas.width = Math.max(1, Math.round(sourceWidth * downscale));
  canvas.height = Math.max(1, Math.round(sourceHeight * downscale));

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
  const base64 = jpegDataUrl.slice(jpegDataUrl.indexOf(",") + 1);
  const bytes = base64ToUint8Array(base64);

  return { bytes, mimeType: "image/jpeg" };
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
