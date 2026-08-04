/**
 * Client-Wrapper für den serverseitigen Versand-Endpunkt
 * (`/api/send-representative-mail`). Baut selbst keine Mailinhalte
 * (siehe `core/materials/buildRepresentativeDeliveryRequest.js`) und
 * enthält keine Zugangsdaten — reiner Transport, analog zu
 * `core/mail/sendGeneratedMaterials.js`.
 *
 * WICHTIG — sendet `recipient` und `humbee` bewusst als ZWEI getrennte
 * Requests (statt wie zuvor kombiniert in einem): Vercel Serverless
 * Functions begrenzen den Request-Body auf ~4,5 MB. Bei einem
 * vollständigen Materialsatz (2 Flyer + Urkunde + QR-Codes) überschritt
 * ein kombinierter Request dieses Limit zuverlässig (siehe
 * `api/send-representative-mail.js`), wodurch Vercel den Request mit
 * einer nicht-JSON-Antwort ablehnte, BEVOR überhaupt eine Mail versendet
 * wurde — sichtbar als scheinbar gleichzeitiger Fehlschlag beider
 * Versände, unabhängig vom tatsächlichen Empfänger. Die Aufteilung in
 * zwei unabhängige Requests senkt das Datenvolumen pro Request und legt
 * offen, wenn eine einzelne Mail (typischerweise humbee mit mehreren
 * großen Einzelanhängen) für sich genommen bereits zu groß ist (siehe
 * `estimateBase64Bytes`/`MAX_REQUEST_BYTES` unten) — dafür gibt es dann
 * eine eigene, verständliche Fehlermeldung statt eines kryptischen
 * Plattform-Fehlers.
 *
 * @param {{
 *   recipient: { to: string, subject: string, text: string, html: string, zipFilename: string, zipContent: string },
 *   humbee: { to: string, subject: string, text: string, attachments: Array<{ filename: string, content: string }> }
 * }} request Ergebnis von `buildRepresentativeDeliveryRequest()`.
 * @returns {Promise<{
 *   ok: boolean,
 *   representative: { success: boolean, messageId?: string, error?: string },
 *   humbee: { success: boolean, messageId?: string, error?: string }
 * }>}
 */
export async function sendRepresentativeMaterials(request) {
  const [representative, humbee] = await Promise.all([
    sendPart({ payload: { recipient: request.recipient }, resultKey: "representative", label: "Versand an Empfänger" }),
    sendPart({ payload: { humbee: request.humbee }, resultKey: "humbee", label: "Dokumentation an humbee" }),
  ]);

  return {
    ok: representative.success && humbee.success,
    representative,
    humbee,
  };
}

// Vercel begrenzt den Request-Body von Serverless Functions (Node-
// Runtime) auf ~4,5 MB — unabhängig vom Plan, nicht per Konfiguration
// erhöhbar. Bewusst mit Sicherheitsabstand (statt exakt 4,5 MB): der
// JSON-Rahmen um den base64-Anhang (Feldnamen, Anführungszeichen,
// weitere Felder wie Betreff/Text) kommt zur reinen Anhangsgröße noch
// hinzu.
const MAX_REQUEST_BYTES = 4_000_000;

function estimateJsonBytes(value) {
  // base64-Inhalte und JSON-Strukturzeichen sind reines ASCII — die
  // UTF-16-Codeunit-Länge von JSON.stringify(...) entspricht hier der
  // tatsächlichen Byte-Anzahl des gesendeten UTF-8-Bodys.
  return JSON.stringify(value).length;
}

/**
 * Sendet einen einzelnen Versandteil (nur `recipient` ODER nur
 * `humbee`) an `/api/send-representative-mail` und liefert dessen
 * Teilergebnis unter dem jeweiligen `resultKey` zurück — unabhängig
 * vom Ergebnis des jeweils anderen Teils (siehe `sendRepresentativeMaterials`).
 */
async function sendPart({ payload, resultKey, label }) {
  const estimatedBytes = estimateJsonBytes(payload);
  if (estimatedBytes > MAX_REQUEST_BYTES) {
    const mb = (estimatedBytes / 1024 / 1024).toFixed(1);
    return {
      success: false,
      error: `${label}: Anhänge zu groß für den Mailversand (${mb} MB, Limit ca. 4 MB). Bitte weniger Materialien gleichzeitig versenden.`,
    };
  }

  let response;
  try {
    response = await fetch("/api/send-representative-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { success: false, error: `${label}: Server nicht erreichbar. Bitte versuche es später erneut.` };
  }

  const result = await response.json().catch(() => null);

  if (result && result[resultKey]) {
    return result[resultKey];
  }

  if (result && typeof result.error === "string") {
    return { success: false, error: result.error };
  }

  return { success: false, error: `${label}: Versand fehlgeschlagen (HTTP ${response.status}).` };
}
