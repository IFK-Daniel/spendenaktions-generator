import { classifyPhotoFetchResponse } from "./classifyPhotoFetchResponse.js";
import { classifyPhotoFetchException } from "./classifyPhotoFetchException.js";
import { detectImageFormatFromContentType } from "./detectImageFormatFromContentType.js";

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Ruft einen Foto-Link **genau einmal** ab und liefert bei Erfolg ein
 * In-Memory-"Photo-Asset" (Rohinhalt als `Uint8Array`, Content-Type,
 * Format, Größe) zurück.
 *
 * Zweck dieser Trennung: `api/validate-photo.js` nutzt das Asset
 * aktuell ausschließlich, um die Validierungsantwort (Größe/Format/
 * Base64-Inhalt) zu bauen. Künftige Materialgeneratoren (z. B. ein
 * Repräsentanten-Flyer, der das Foto einbettet) können denselben,
 * bereits abgerufenen Inhalt weiterverwenden, indem sie innerhalb
 * desselben Funktionsaufrufs auf `asset.content` zugreifen — **ohne**
 * das Foto ein zweites Mal per HTTP zu laden. Das Asset lebt
 * ausschließlich für die Dauer des aktuellen Requests: keine
 * Zwischenspeicherung in Datei, Datenbank oder einem modulweiten
 * Cache, keine Persistenz zwischen Requests.
 *
 * @param {object} params
 * @param {string} params.photoUrl
 * @param {typeof fetch} [params.fetchImpl] Injizierbar für Tests
 *   (Produktionsverhalten nutzt standardmäßig das globale `fetch`).
 * @param {number} [params.timeoutMs] Standard: 8000ms.
 * @returns {Promise<
 *   { ok: true, asset: { contentType: string, format: string, size: number, content: Uint8Array } } |
 *   { ok: false, reason: "http_error" | "timeout" | "redirect_login" | "invalid_content_type" }
 * >}
 */
export async function retrieveRepresentativePhotoAsset({ photoUrl, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(photoUrl, { signal: controller.signal, redirect: "follow" });
    const contentType = response.headers.get("content-type") || "";

    const classification = classifyPhotoFetchResponse({
      status: response.status,
      contentType,
      redirected: response.redirected,
    });

    if (!classification.ok) {
      return { ok: false, reason: classification.reason };
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      ok: true,
      asset: {
        contentType: classification.contentType,
        format: detectImageFormatFromContentType(contentType),
        size: arrayBuffer.byteLength,
        content: new Uint8Array(arrayBuffer),
      },
    };
  } catch (err) {
    return { ok: false, reason: classifyPhotoFetchException(err) };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
