import { buildSessionCookie, isSessionAuthConfigured } from "./_lib/sessionAuth.js";
import { isUpstashConfigured, redisIncrWithExpiry } from "./_lib/upstashRedis.js";

// Kleines Fixed-Window-Rate-Limit gegen automatisiertes Durchprobieren
// von Zugangsdaten (Defense-in-depth, ERSETZT NICHT die eigentliche
// Authentifizierung — siehe `isBlockedByRateLimit`-Kommentar unten und
// `redisIncrWithExpiry` in `api/_lib/upstashRedis.js`). Nutzt bewusst
// die ohnehin vorhandene Redis-Instanz statt neuer Infrastruktur.
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 5 * 60;

function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress;
}

/**
 * Prüft, ob für die anfragende IP das Login-Rate-Limit bereits
 * überschritten ist. Bewusst "fail open" bei jedem Infrastruktur-
 * problem (Redis nicht konfiguriert/erreichbar, keine ermittelbare
 * IP) — ein Ausfall des Rate-Limits darf legitime Logins nie
 * blockieren; die eigentliche Sicherheitsgrenze bleibt die
 * Zugangsdaten-Prüfung selbst.
 *
 * @param {*} req
 * @returns {Promise<boolean>}
 */
async function isBlockedByRateLimit(req) {
  if (!isUpstashConfigured()) return false;
  const ip = getClientIp(req);
  if (!ip) return false;

  try {
    const attempts = await redisIncrWithExpiry(`ifk:loginrate:${ip}`, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
    return attempts > LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

/**
 * Prüft die Zugangsdaten für den internen Materialgenerator gegen
 * Umgebungsvariablen (`MATERIAL_ADMIN_USERNAME`, `MATERIAL_ADMIN_PASSWORD`).
 * Genau ein Administrator-Konto, keine Benutzerverwaltung, keine
 * Datenbank.
 *
 * Bei Erfolg setzt dieser Endpunkt zusätzlich zu `{ ok: true }` ein
 * signiertes, `HttpOnly`/`Secure`-Session-Cookie (`api/_lib/sessionAuth.js`)
 * — das ist die einzige serverseitig verifizierbare Bestätigung eines
 * Logins und schützt schreibende Endpunkte wie `/api/reserve-ifk-id`.
 * Der rein clientseitige "angemeldet"-Zustand in `sessionStorage`
 * (`core/auth/authSession.js`) bleibt zusätzlich bestehen — er steuert
 * ausschließlich die UI (Login-/App-Bereich), nicht die Autorisierung.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (await isBlockedByRateLimit(req)) {
    res.status(429).json({ ok: false, error: "Zu viele Anmeldeversuche. Bitte versuche es später erneut." });
    return;
  }

  const { username, password } = req.body || {};

  const expectedUsername = process.env.MATERIAL_ADMIN_USERNAME;
  const expectedPassword = process.env.MATERIAL_ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.error("[login] MATERIAL_ADMIN_USERNAME/MATERIAL_ADMIN_PASSWORD ist nicht konfiguriert.");
    res.status(500).json({ ok: false, error: "Login ist derzeit nicht verfügbar." });
    return;
  }

  if (!isSessionAuthConfigured()) {
    console.error("[login] SESSION_SECRET ist nicht konfiguriert.");
    res.status(500).json({ ok: false, error: "Login ist derzeit nicht verfügbar." });
    return;
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username !== expectedUsername ||
    password !== expectedPassword
  ) {
    res.status(401).json({ ok: false, error: "Benutzername oder Passwort ist falsch." });
    return;
  }

  res.setHeader("Set-Cookie", buildSessionCookie());
  res.status(200).json({ ok: true });
}
