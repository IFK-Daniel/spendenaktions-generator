/**
 * Client-Wrapper für den serverseitigen Login-Endpunkt (`/api/login`).
 * Prüft die Zugangsdaten bewusst nicht selbst — der Abgleich gegen
 * `MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD` findet
 * ausschließlich serverseitig statt, damit keine Zugangsdaten im
 * Frontend-Bundle landen. Bei Erfolg setzt der Server zusätzlich ein
 * `HttpOnly`/`Secure`-Session-Cookie (`api/_lib/sessionAuth.js`) —
 * `credentials: "same-origin"` stellt sicher, dass der Browser dieses
 * Cookie tatsächlich akzeptiert/mitsendet.
 *
 * @param {{ username: string, password: string }} params
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function requestLogin({ username, password }) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ username, password }),
  });

  const result = await response.json().catch(() => ({}));

  return { ok: response.ok && result.ok === true, error: result.error };
}
