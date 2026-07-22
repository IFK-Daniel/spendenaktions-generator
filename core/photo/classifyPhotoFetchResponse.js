/**
 * Bewertet die Antwort eines (serverseitigen) Foto-Link-Abrufs anhand
 * von HTTP-Status, Content-Type und ob eine Weiterleitung stattfand —
 * reine, DOM- und netzwerkfreie Entscheidungslogik, unabhängig vom
 * eigentlichen `fetch()`-Aufruf (siehe `api/validate-photo.js`).
 *
 * Erwartet für Erfolg: Status 200 und ein Content-Type, der mit
 * `image/` beginnt. Bei Nichterfüllung wird zwischen drei Fehler-
 * Kategorien unterschieden:
 * - `"http_error"` — Status ist nicht 200 (z. B. 404, 403, 500).
 * - `"redirect_login"` — Status 200, aber kein Bild-Content-Type,
 *   UND es fand mindestens eine Weiterleitung statt (typisch für
 *   eine Umleitung auf eine Anmelde-/Login-Seite statt des Bildes).
 * - `"invalid_content_type"` — Status 200, kein Bild-Content-Type,
 *   ohne vorherige Weiterleitung (z. B. HTML-Seite statt Bild).
 *
 * @param {object} params
 * @param {number} params.status
 * @param {string} [params.contentType]
 * @param {boolean} [params.redirected]
 * @returns {{ ok: true, contentType: string } | { ok: false, reason: "http_error" | "redirect_login" | "invalid_content_type" }}
 */
export function classifyPhotoFetchResponse({ status, contentType, redirected } = {}) {
  if (status !== 200) {
    return { ok: false, reason: "http_error" };
  }

  const normalizedContentType = typeof contentType === "string" ? contentType.toLowerCase() : "";

  if (!normalizedContentType.startsWith("image/")) {
    return { ok: false, reason: redirected ? "redirect_login" : "invalid_content_type" };
  }

  return { ok: true, contentType: normalizedContentType };
}
