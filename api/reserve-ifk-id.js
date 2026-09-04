import { validateIfkId } from "../core/id/validateIfkId.js";
import { isUpstashConfigured, redisSetNx } from "./_lib/upstashRedis.js";

/**
 * Reserviert serverseitig eine IFK-ID atomar (`SET key 1 NX` über
 * Upstash Redis), damit "Neu generieren" nie doppelt dieselbe ID
 * ausgibt (siehe `core/id/reserveIfkId.js`, `core/id/generateAndReserveIfkId.js`).
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
 *   503 { ok: false, error }           — Speicher nicht konfiguriert/erreichbar;
 *                                         es wurde in diesem Fall NICHTS reserviert.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { ifkId } = req.body || {};
  const check = validateIfkId(ifkId);
  if (!check.valid) {
    res.status(400).json({ ok: false, error: "Ungültige IFK-ID." });
    return;
  }

  if (!isUpstashConfigured()) {
    console.error("[reserve-ifk-id] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN ist nicht konfiguriert.");
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
