import { generateIfkId } from "./generateIfkId.js";
import { reserveIfkId } from "./reserveIfkId.js";

// Bei kollidierenden Kandidaten erneut versuchen — 32.768 mögliche IDs
// (siehe `generateIfkId.js`), eine niedrige zweistellige Anzahl an
// Versuchen deckt reale Kollisionswahrscheinlichkeiten bei Weitem ab,
// ohne bei einem echten Speicherproblem lange zu blockieren.
const MAX_ATTEMPTS = 10;

const UNAVAILABLE_ERROR = "Die IFK-ID konnte gerade nicht eindeutig reserviert werden. Bitte versuche es später erneut.";

/**
 * Erzeugt eine neue IFK-ID und reserviert sie serverseitig — bei
 * Kollision mit einer bereits vergebenen ID wird automatisch ein neuer
 * Kandidat erzeugt und erneut versucht. Liefert ausschließlich eine ID
 * zurück, die tatsächlich erfolgreich reserviert wurde; im Fehlerfall
 * (Speicher nicht erreichbar, oder alle Versuche kollidiert) wird KEINE
 * ungeprüfte ID zurückgegeben.
 *
 * @returns {Promise<{ ok: true, ifkId: string } | { ok: false, error: string }>}
 */
export async function generateAndReserveIfkId() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = generateIfkId();
    const result = await reserveIfkId(candidate);
    if (result.ok) {
      return { ok: true, ifkId: candidate };
    }
    if (result.reason !== "taken") {
      return { ok: false, error: result.error || UNAVAILABLE_ERROR };
    }
  }
  return { ok: false, error: UNAVAILABLE_ERROR };
}
