import { buildClearSessionCookie } from "./_lib/sessionAuth.js";

/**
 * Löscht das interne Session-Cookie (`api/_lib/sessionAuth.js`).
 * Bewusst ohne eigene Session-Prüfung — ein Logout ist immer erlaubt,
 * auch wenn die Session bereits abgelaufen oder gar nicht vorhanden
 * ist (idempotent, kein Fehlerfall). Löscht ausschließlich das Cookie,
 * keine serverseitige Session-Liste (existiert nicht, siehe
 * `api/_lib/sessionAuth.js`-Kommentar zum zustandslosen Ansatz).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  res.setHeader("Set-Cookie", buildClearSessionCookie());
  res.status(200).json({ ok: true });
}
