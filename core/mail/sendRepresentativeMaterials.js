/**
 * Client-Wrapper für den serverseitigen Versand-Endpunkt
 * (`/api/send-representative-mail`). Baut selbst keine Mailinhalte
 * (siehe `core/materials/buildRepresentativeDeliveryRequest.js`) und
 * enthält keine Zugangsdaten — reiner Transport, analog zu
 * `core/mail/sendGeneratedMaterials.js`.
 *
 * WICHTIG — zwei Maßnahmen gegen das Vercel-Payload-Limit (Serverless
 * Functions begrenzen den Request-Body auf ~4,5 MB, plattformseitig,
 * nicht per Konfiguration erhöhbar):
 *
 * 1) `recipient` und `humbee` werden als ZWEI unabhängige Requests
 *    gesendet statt wie zuvor kombiniert in einem. Ein kombinierter
 *    Request überschritt bei einem vollständigen Materialsatz (2 Flyer
 *    + Urkunde + QR-Codes, jeweils base64-kodiert sowohl im ZIP für den
 *    Repräsentanten als auch einzeln für humbee) das Limit zuverlässig
 *    — Vercel lehnte ihn mit einer nicht-JSON-Antwort ab, BEVOR
 *    überhaupt eine Mail versendet wurde, sichtbar als scheinbar
 *    gleichzeitiger Fehlschlag beider Versände unabhängig vom
 *    tatsächlichen Empfänger.
 * 2) Die humbee-Anhänge werden zusätzlich in mehrere Mails aufgeteilt
 *    (`chunkAttachments`), falls schon die humbee-Mail ALLEIN das
 *    Limit überschreiten würde (z. B. beide Flyer + Urkunde
 *    gleichzeitig, ~4,5–4,7 MB base64-kodiert — bereits ohne den
 *    ZIP-Anhang des Repräsentanten zu groß für einen einzelnen
 *    Request). humbee erhält in diesem Fall mehrere Mails mit
 *    fortlaufender "(Teil n/m)"-Kennzeichnung im Betreff, statt dass
 *    die Dokumentation komplett fehlschlägt.
 *
 * Bleibt eine einzelne Datei (z. B. ein sehr großes Foto) für sich
 * genommen zu groß, meldet `sendPart` das mit einer konkreten,
 * verständlichen Fehlermeldung statt eines kryptischen Plattform-413.
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
    sendHumbee(request.humbee),
  ]);

  return {
    ok: representative.success && humbee.success,
    representative,
    humbee,
  };
}

// Vercel begrenzt den Request-Body von Serverless Functions (Node-
// Runtime) auf ~4,5 MB — unabhängig vom Plan, nicht per Konfiguration
// erhöhbar. Die reale Schwelle wurde per Live-Test gegen Production
// eingegrenzt: 4.400.155 Byte kamen noch durch (200), 4.506.823 Byte
// wurden bereits abgelehnt (413) — die Grenze liegt also zwischen
// diesen beiden Werten. 4.300.000 Byte lassen ausreichend
// Sicherheitsabstand nach oben (der JSON-Rahmen um den base64-Anhang
// kommt zur reinen Anhangsgröße noch hinzu), ohne realistische
// Materialsätze unnötig zu blockieren — ein früherer, konservativerer
// Wert (4.000.000 Byte) hatte einen tatsächlich noch zustellbaren
// ~4,2-MB-Request bereits vorab abgewiesen.
const MAX_REQUEST_BYTES = 4_300_000;

function estimateJsonBytes(value) {
  // base64-Inhalte und JSON-Strukturzeichen sind reines ASCII — die
  // UTF-16-Codeunit-Länge von JSON.stringify(...) entspricht hier der
  // tatsächlichen Byte-Anzahl des gesendeten UTF-8-Bodys.
  return JSON.stringify(value).length;
}

/**
 * Teilt `attachments` in möglichst wenige Gruppen auf, sodass eine
 * humbee-Mail mit `restOfHumbee` (alle humbee-Felder außer
 * `attachments`) plus jeweils einer Gruppe das Byte-Limit einhält.
 * Greedy: sammelt Anhänge, bis der nächste das Limit sprengen würde,
 * beginnt dann eine neue Gruppe. Eine einzelne, für sich genommen zu
 * große Datei bildet ihre eigene (dann zu große) Gruppe — das wird
 * beim Versand dieser Gruppe als eigener, konkreter Fehler sichtbar,
 * statt den gesamten Versand zu blockieren oder still zu verschlucken.
 *
 * @param {Array<{filename: string, content: string}>} attachments
 * @param {object} restOfHumbee
 * @returns {Array<Array<{filename: string, content: string}>>} Mindestens eine Gruppe (auch bei leeren `attachments`).
 */
function chunkAttachments(attachments, restOfHumbee) {
  const baseBytes = estimateJsonBytes({ humbee: { ...restOfHumbee, attachments: [] } });
  const groups = [];
  let current = [];
  let currentBytes = baseBytes;

  for (const attachment of attachments) {
    const attachmentBytes = estimateJsonBytes(attachment) + 1; // +1 für das Komma-Trennzeichen im Array
    if (current.length > 0 && currentBytes + attachmentBytes > MAX_REQUEST_BYTES) {
      groups.push(current);
      current = [];
      currentBytes = baseBytes;
    }
    current.push(attachment);
    currentBytes += attachmentBytes;
  }

  groups.push(current);
  return groups;
}

/**
 * Sendet die humbee-Dokumentation, bei Bedarf aufgeteilt auf mehrere
 * Mails (siehe `chunkAttachments`). Gilt nur dann als erfolgreich, wenn
 * ALLE Teile erfolgreich versendet wurden.
 */
async function sendHumbee(humbee) {
  const { attachments, ...restOfHumbee } = humbee;
  const groups = chunkAttachments(attachments, restOfHumbee);

  if (groups.length === 1) {
    return sendPart({ payload: { humbee }, resultKey: "humbee", label: "Dokumentation an humbee" });
  }

  const partResults = await Promise.all(
    groups.map((group, index) =>
      sendPart({
        payload: {
          humbee: {
            ...restOfHumbee,
            subject: `${humbee.subject} (Teil ${index + 1}/${groups.length})`,
            attachments: group,
          },
        },
        resultKey: "humbee",
        label: `Dokumentation an humbee (Teil ${index + 1}/${groups.length})`,
      })
    )
  );

  const allSucceeded = partResults.every((part) => part.success);
  return {
    success: allSucceeded,
    messageId: allSucceeded ? partResults.map((part) => part.messageId).filter(Boolean).join(", ") : undefined,
    error: allSucceeded ? undefined : partResults.filter((part) => !part.success).map((part) => part.error).join(" "),
  };
}

/**
 * Sendet einen einzelnen Versandteil (nur `recipient` ODER nur
 * `humbee`, ggf. mit einer Teilmenge der humbee-Anhänge) an
 * `/api/send-representative-mail` und liefert dessen Teilergebnis
 * unter dem jeweiligen `resultKey` zurück.
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
