import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Serverseitig verifizierbare Session für den internen Materialgenerator.
 *
 * Hintergrund: Vor diesem Modul bestand nach `/api/login` ausschließlich
 * ein clientseitiger "angemeldet"-Zustand in `sessionStorage`
 * (`core/auth/authSession.js`) — der Server konnte einen Request also
 * NICHT von einem angemeldeten Browser unterscheiden. Das machte
 * schreibende Endpunkte wie `/api/reserve-ifk-id` faktisch öffentlich
 * aufrufbar, obwohl die UI dafür einen Login voraussetzt.
 *
 * Lösung: ein zustandsloses, serverseitig signiertes Session-Token in
 * einem HttpOnly/Secure-Cookie — bewusst KEINE neue Session-Datenbank
 * ("keine neue große Auth-Plattform"): das Token trägt sein
 * Ablaufdatum selbst, die Signatur (HMAC-SHA256 mit `SESSION_SECRET`)
 * verhindert Fälschung/Verlängerung durch den Client. Enthält keine
 * Zugangsdaten und keine Personendaten — nur einen Ablaufzeitstempel.
 *
 * Cookie-Eigenschaften (siehe `buildSessionCookie`): `HttpOnly` (kein
 * Zugriff aus clientseitigem JavaScript, schützt gegen XSS-Diebstahl),
 * `Secure` (nur über HTTPS übertragen), `SameSite=Strict` (kein
 * Versand bei von außen initiierten Requests), `Path=/api` (nur an
 * API-Endpunkte gesendet, nicht an sonstige Assets), `Max-Age` (zeitlich
 * begrenzt, siehe `SESSION_TTL_MS`).
 */

export const SESSION_COOKIE_NAME = "ifk_intern_session";

// 12 Stunden — deckt einen Arbeitstag ab, ohne Endlos-Sessions zu
// erlauben. Nach Ablauf ist der Token nicht mehr gültig (siehe
// `isValidSessionToken`), unabhängig davon, ob das Cookie selbst noch
// im Browser vorhanden ist.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ist nicht konfiguriert.");
  }
  return secret;
}

function sign(payloadB64) {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

/**
 * @returns {boolean} `true`, wenn `SESSION_SECRET` gesetzt ist — ohne
 *   dieses Secret können weder neue Sessions ausgestellt noch
 *   bestehende geprüft werden.
 */
export function isSessionAuthConfigured() {
  return Boolean(process.env.SESSION_SECRET);
}

/**
 * Erzeugt ein neues, gültiges Session-Token (Payload + Signatur, durch
 * `.` getrennt, beide Teile base64url-kodiert). Enthält ausschließlich
 * einen Ablaufzeitstempel — keine Zugangsdaten, keine Personendaten.
 *
 * @param {number} [ttlMs] Gültigkeitsdauer ab jetzt in Millisekunden;
 *   Standard `SESSION_TTL_MS`. Ein negativer Wert erzeugt absichtlich
 *   ein bereits abgelaufenes, aber korrekt signiertes Token — dient
 *   ausschließlich dazu, das Ablaufverhalten von `isValidSessionToken`
 *   testbar zu machen, ohne die Signaturprüfung zu umgehen.
 * @returns {string}
 * @throws {Error} Wenn `SESSION_SECRET` nicht konfiguriert ist.
 */
export function createSessionToken(ttlMs = SESSION_TTL_MS) {
  const payload = JSON.stringify({ exp: Date.now() + ttlMs });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Prüft ein Session-Token auf gültige Signatur UND Ablaufdatum.
 * Zeitkonstanter Signaturvergleich (`timingSafeEqual`) gegen
 * Timing-Angriffe. Liefert `false` bei jedem Fehler (fehlendes/
 * fehlerhaftes Format, falsche/manipulierte Signatur, abgelaufen,
 * `SESSION_SECRET` nicht konfiguriert) — nie eine Ausnahme.
 *
 * @param {unknown} token
 * @returns {boolean}
 */
export function isValidSessionToken(token) {
  if (typeof token !== "string" || token.length === 0) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) return false;

  const payloadB64 = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  let expectedSignature;
  try {
    expectedSignature = sign(payloadB64);
  } catch {
    return false;
  }

  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length) return false;
  if (!timingSafeEqual(provided, expected)) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  return typeof payload.exp === "number" && Date.now() < payload.exp;
}

/**
 * Liest einen einzelnen Cookie-Wert aus dem rohen `Cookie`-Request-
 * Header. Kein externes Cookie-Parsing-Paket nötig für diesen einen
 * Anwendungsfall.
 *
 * @param {string | undefined} cookieHeader
 * @param {string} name
 * @returns {string | undefined}
 */
export function readCookie(cookieHeader, name) {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key === name) {
      return part.slice(separatorIndex + 1).trim();
    }
  }
  return undefined;
}

/**
 * Prüft, ob ein eingehender Request eine gültige interne Session trägt
 * (liest und verifiziert das Session-Cookie aus `req.headers.cookie`).
 *
 * @param {{ headers: { cookie?: string } }} req
 * @returns {boolean}
 */
export function hasValidSession(req) {
  const cookieHeader = req?.headers?.cookie;
  const token = readCookie(cookieHeader, SESSION_COOKIE_NAME);
  return isValidSessionToken(token);
}

/**
 * `Set-Cookie`-Header-Wert für ein frisches, gültiges Session-Token.
 * @returns {string}
 */
export function buildSessionCookie() {
  const token = createSessionToken();
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${maxAgeSeconds}`;
}

/**
 * `Set-Cookie`-Header-Wert, der das Session-Cookie beim Client löscht
 * (Logout). Dieselben Attribute wie beim Setzen sind nötig, damit der
 * Browser das ursprüngliche Cookie eindeutig identifiziert.
 * @returns {string}
 */
export function buildClearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;
}
