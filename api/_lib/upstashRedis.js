/**
 * Minimaler Client für die Upstash-Redis-REST-API — genutzt ausschließlich
 * für die atomare Reservierung von IFK-IDs (`api/reserve-ifk-id.js`,
 * `scripts/import-ifk-ids.mjs`). Keine eigene Bibliothek (`@upstash/redis`
 * o. ä.), da nur ein einziger Befehl benötigt wird (`SET key value NX`,
 * d. h. "setze nur, wenn noch nicht vorhanden") — die REST-API ist dafür
 * per einfachem `fetch()` ausreichend.
 *
 * Benötigte Umgebungsvariablen (siehe `docs/operations-audit.md`):
 *   - `UPSTASH_REDIS_REST_URL`
 *   - `UPSTASH_REDIS_REST_TOKEN`
 *
 * Enthält bewusst keine Fallback-/Mock-Logik: Ist Upstash nicht
 * konfiguriert oder nicht erreichbar, wirft dieses Modul einen Fehler —
 * die aufrufende Seite (`api/reserve-ifk-id.js`) entscheidet, wie das
 * dem Client gemeldet wird (siehe dortige Fehlerbehandlung: KEINE
 * ungeprüfte ID im Fehlerfall).
 */

function getConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

/**
 * @returns {boolean} `true`, wenn beide benötigten Umgebungsvariablen gesetzt sind.
 */
export function isUpstashConfigured() {
  const { url, token } = getConfig();
  return Boolean(url && token);
}

/**
 * Setzt `key` auf `value`, aber ausschließlich dann, wenn `key` noch
 * nicht existiert (Redis `SET key value NX`) — atomar, also sicher bei
 * gleichzeitigen Aufrufen mit demselben `key`.
 *
 * @param {string} key
 * @param {string} value
 * @returns {Promise<boolean>} `true`, wenn `key` gerade frisch gesetzt
 *   wurde (war vorher nicht vorhanden). `false`, wenn `key` bereits
 *   existierte (nichts wurde verändert).
 * @throws {Error} Wenn Upstash nicht konfiguriert oder nicht erreichbar
 *   ist, oder eine unerwartete Antwort liefert.
 */
export async function redisSetNx(key, value) {
  const { url, token } = getConfig();
  if (!url || !token) {
    throw new Error("Upstash Redis ist nicht konfiguriert (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN fehlen).");
  }

  const endpoint = `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/NX`;
  let response;
  try {
    response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(`Upstash Redis ist nicht erreichbar: ${err instanceof Error ? err.message : "unbekannter Fehler"}`);
  }

  if (!response.ok) {
    throw new Error(`Upstash-Anfrage fehlgeschlagen (HTTP ${response.status}).`);
  }

  const data = await response.json();
  // Upstash liefert bei erfolgreichem SET ... NX `{ result: "OK" }`,
  // wenn der Key bereits existierte `{ result: null }`.
  return data.result === "OK";
}
