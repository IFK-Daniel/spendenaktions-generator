/**
 * Minimaler Client für die Upstash-Redis-REST-API — genutzt ausschließlich
 * für die atomare Reservierung von IFK-IDs (`api/reserve-ifk-id.js`,
 * `scripts/import-ifk-ids.mjs`). Keine eigene Bibliothek (`@upstash/redis`
 * o. ä.), da nur ein einziger Befehl benötigt wird (`SET key value NX`,
 * d. h. "setze nur, wenn noch nicht vorhanden") — die REST-API ist dafür
 * per einfachem `fetch()` ausreichend.
 *
 * Unterstützte Umgebungsvariablen (siehe `docs/operations-audit.md`),
 * in dieser Priorität:
 *   1. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
 *      — Name, den eine direkte Upstash-"Redis"-Marketplace-Ressource
 *      in Vercel vergibt.
 *   2. `KV_REST_API_URL` / `KV_REST_API_TOKEN`
 *      — Name, den Vercels eigenes "Storage"-Produkt vergibt, wenn dort
 *      eine (intern ebenfalls von Upstash betriebene) Redis-Datenbank
 *      über den "Create Database"-Dialog angelegt wird; dieselbe REST-
 *      API/derselbe Befehlssatz, nur anders benannt.
 * Beide Namenspaare sind aktuell tatsächlich von Vercel vergebene Namen
 * (kein geratener Drittname) — welches Paar zutrifft, hängt nur davon
 * ab, über welchen Dialog die Ressource angelegt wurde. Ist das erste
 * Paar vollständig gesetzt, hat es Vorrang; sonst wird auf das zweite
 * zurückgegriffen. Ein Mischen unvollständiger Paare (z. B. nur die URL
 * aus Paar 1, nur der Token aus Paar 2) gilt bewusst als "nicht
 * konfiguriert" — sonst könnte eine URL aus einer anderen Instanz als
 * der Token verwendet werden.
 *
 * Enthält bewusst keine weitere Fallback-/Mock-Logik: Ist Upstash nicht
 * konfiguriert oder nicht erreichbar, wirft dieses Modul einen Fehler —
 * die aufrufende Seite (`api/reserve-ifk-id.js`) entscheidet, wie das
 * dem Client gemeldet wird (siehe dortige Fehlerbehandlung: KEINE
 * ungeprüfte ID im Fehlerfall).
 */

function getConfig() {
  const primaryUrl = process.env.UPSTASH_REDIS_REST_URL;
  const primaryToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (primaryUrl && primaryToken) {
    return { url: primaryUrl, token: primaryToken };
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    return { url: kvUrl, token: kvToken };
  }

  return { url: undefined, token: undefined };
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
    throw new Error(
      "Upstash Redis ist nicht konfiguriert (weder UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN noch KV_REST_API_URL/KV_REST_API_TOKEN vollständig gesetzt)."
    );
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
