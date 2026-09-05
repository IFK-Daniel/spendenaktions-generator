import { validateIfkId } from "../core/id/validateIfkId.js";
import { isUpstashConfigured, redisSetNx } from "./_lib/upstashRedis.js";
import { hasValidSession } from "./_lib/sessionAuth.js";

/**
 * Reserviert serverseitig eine IFK-ID atomar (`SET key 1 NX` über
 * Upstash Redis), damit "Neu generieren" nie doppelt dieselbe ID
 * ausgibt (siehe `core/id/reserveIfkId.js`, `core/id/generateAndReserveIfkId.js`).
 *
 * ZUGRIFFSSCHUTZ: Dieser Endpunkt verändert dauerhaften Zustand (jede
 * erfolgreiche Reservierung entzieht dem begrenzten IFK-ID-Namensraum
 * — 32.768 mögliche IDs, siehe `core/id/generateIfkId.js` — dauerhaft
 * eine ID) und erfordert deshalb eine gültige interne Session
 * (`api/_lib/sessionAuth.js`, gesetzt über `/api/login`). Ohne gültiges
 * Session-Cookie: `401`, KEINE Redis-Operation — weder lesend noch
 * schreibend. Die Prüfung steht bewusst als Erstes, vor jeder
 * Body-/Formatverarbeitung.
 *
 * Speicherschema (siehe `docs/operations-audit.md`):
 *   Key:   `ifk:id:<ID>` (z. B. `ifk:id:IFKLJP`)
 *   Value: `"1"` — rein technischer Marker, keine Personendaten.
 *
 * Es wird ausschließlich die IFK-ID selbst gespeichert. Keine Namen,
 * keine E-Mail-Adresse, keine Rolle, keine sonstigen Wegbegleiterdaten.
 * Die Zuordnung IFK-ID ↔ Person bleibt ausschließlich in humbee.
 *
 * Antwort:
 *   200 { ok: true, reserved: true }   — ID war frei, ist jetzt reserviert.
 *   200 { ok: true, reserved: false }  — ID war bereits vergeben.
 *   400 { ok: false, error }           — ID formal ungültig.
 *   401 { ok: false, error }           — keine gültige interne Session.
 *   503 { ok: false, error }           — Speicher nicht konfiguriert/erreichbar;
 *                                         es wurde in diesem Fall NICHTS reserviert.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!hasValidSession(req)) {
    res.status(401).json({ ok: false, error: "Bitte melde dich erneut an." });
    return;
  }

  const { ifkId } = req.body || {};
  const check = validateIfkId(ifkId);
  if (!check.valid) {
    res.status(400).json({ ok: false, error: "Ungültige IFK-ID." });
    return;
  }

  if (!isUpstashConfigured()) {
    console.error(
      "[reserve-ifk-id] Redis ist nicht konfiguriert (weder UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN noch KV_REST_API_URL/KV_REST_API_TOKEN vollständig gesetzt)."
    );
    res.status(503).json({
      ok: false,
      error: "Die IFK-ID konnte gerade nicht eindeutig reserviert werden. Bitte versuche es später erneut.",
    });
    return;
  }

  try {
    const reserved = await redisSetNx(`ifk:id:${check.normalized}`, "1");
    res.status(200).json({ ok: true, reserved });
  } catch (err) {
    console.error("[reserve-ifk-id] Reservierung fehlgeschlagen:", err instanceof Error ? err.message : "unknown error");
    res.status(503).json({
      ok: false,
      error: "Die IFK-ID konnte gerade nicht eindeutig reserviert werden. Bitte versuche es später erneut.",
    });
  }
}
