/**
 * Client-Wrapper für den serverseitigen Logout-Endpunkt (`/api/logout`)
 * — löscht das interne Session-Cookie (`api/_lib/sessionAuth.js`)
 * serverseitig. Ergänzt `clearAuthenticated()` (`core/auth/authSession.js`),
 * das nur den clientseitigen UI-Zustand in `sessionStorage` löscht;
 * ohne diesen Aufruf bliebe das Session-Cookie bis zu seinem Ablauf
 * gültig, selbst nach einem UI-Logout.
 *
 * Absichtlich fehlertolerant: Ein Netzwerkfehler beim Logout darf den
 * UI-Logout nicht blockieren (siehe `src/intern/auth.js`) — das Cookie
 * läuft in diesem Fall spätestens nach `SESSION_TTL_MS` von selbst ab.
 *
 * @returns {Promise<void>}
 */
export async function requestLogout() {
  try {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // Bewusst kein Fehler nach außen — s. Doku oben.
  }
}
