import { validateIfkId } from "./validateIfkId.js";

/**
 * Reserviert eine IFK-ID serverseitig (`/api/reserve-ifk-id`), um
 * Mehrfachvergabe/Kollisionen zwischen gleichzeitigen Aktionen/
 * Repräsentanten zu verhindern.
 *
 * Reiner Transport, analog zu `core/mail/sendRepresentativeMaterials.js`:
 * baut keine eigene Speicherlogik, kennt nur den API-Vertrag. Die
 * eigentliche atomare Reservierung (Redis `SET ... NX`) passiert
 * serverseitig in `api/reserve-ifk-id.js`.
 *
 * Für den vollständigen "erzeugen + reservieren, bei Kollision erneut
 * versuchen"-Ablauf siehe `generateAndReserveIfkId()`.
 *
 * @param {string} ifkId Eine gemäß `validateIfkId` formal gültige IFK-ID.
 * @returns {Promise<{ ok: boolean, reason: "reserved"|"taken"|"invalid"|"unreachable"|"server-error", error?: string }>}
 *   `ok: true` nur, wenn die ID gerade frisch reserviert wurde (war
 *   vorher frei). In jedem anderen Fall `ok: false` — `reason`
 *   unterscheidet dabei "ID bereits vergeben" (`taken`, für erneuten
 *   Versuch mit neuer ID) von echten Fehlern (`invalid`, `unreachable`,
 *   `server-error`).
 */
export async function reserveIfkId(ifkId) {
  const check = validateIfkId(ifkId);
  if (!check.valid) {
    return { ok: false, reason: "invalid", error: "Ungültige IFK-ID." };
  }

  const unreachableResult = {
    ok: false,
    reason: "unreachable",
    error: "Die IFK-ID konnte gerade nicht eindeutig reserviert werden. Bitte versuche es später erneut.",
  };

  let response;
  try {
    response = await fetch("/api/reserve-ifk-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ifkId: check.normalized }),
    });
  } catch {
    return unreachableResult;
  }

  const result = await response.json().catch(() => null);
  if (!result || typeof result.ok !== "boolean") {
    return unreachableResult;
  }

  if (!response.ok || !result.ok) {
    return { ok: false, reason: "server-error", error: unreachableResult.error };
  }

  if (result.reserved === true) {
    return { ok: true, reason: "reserved" };
  }

  return { ok: false, reason: "taken", error: "Diese IFK-ID ist bereits vergeben." };
}
