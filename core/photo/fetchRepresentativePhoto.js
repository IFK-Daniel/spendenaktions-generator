/**
 * Client-Wrapper für den serverseitigen Prüf-Endpunkt
 * (`/api/validate-photo`). Lädt selbst kein Bild direkt im Browser
 * (Foto-Hosts erlauben oft kein CORS) — der eigentliche Abruf und die
 * Content-Type-/Status-Prüfung laufen serverseitig, siehe
 * `core/photo/classifyPhotoFetchResponse.js` und
 * `api/validate-photo.js`. Reiner Transport, analog zu
 * `core/mail/sendGeneratedMaterials.js`.
 *
 * @param {string} photoUrl
 * @returns {Promise<{
 *   ok: true, size: number, format: string, contentType: string, content: string
 * } | {
 *   ok: false, reason?: "http_error" | "timeout" | "redirect_login" | "invalid_content_type"
 * }>}
 */
export async function fetchRepresentativePhoto(photoUrl) {
  const response = await fetch("/api/validate-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoUrl }),
  });

  const result = await response.json().catch(() => ({}));

  if (result.ok === true) {
    return result;
  }

  return { ok: false, reason: result.reason };
}
