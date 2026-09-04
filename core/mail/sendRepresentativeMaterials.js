/**
 * Client-Wrapper für den serverseitigen Versand-Endpunkt
 * (`/api/send-representative-mail`). Baut selbst keine Mailinhalte
 * (siehe `core/materials/buildRepresentativeDeliveryRequest.js`) und
 * enthält keine Zugangsdaten — reiner Transport, analog zu
 * `core/mail/sendGeneratedMaterials.js`.
 *
 * TRANSPORT: `multipart/form-data` statt Base64-in-JSON (bis
 * einschließlich `fix: further reduce companion material payload` war
 * es JSON mit Base64-kodierten Dateiinhalten). Grund: Vercel Serverless
 * Functions (Node-Runtime) begrenzen den Request-Body auf ~4,5 MB —
 * das gilt für die ROHEN Bytes des HTTP-Bodys, unabhängig von der
 * Kodierung. Base64 vergrößert Binärdaten um Faktor 4/3 (+33%); bei
 * `multipart/form-data` werden Dateien dagegen roh (unkodiert)
 * übertragen, wodurch bei GLEICHEM Vercel-Limit ca. 33% mehr tatsäch-
 * liche Materialgröße in einen Request passt — siehe
 * `artifacts/size-analysis/attachment-size-analysis.md`, Abschnitt 8
 * (Option C), für die Herleitung.
 *
 * SEIT DER TRENNUNG von Arbeits-/Marketingmaterialien und persönlicher
 * Urkunde (siehe `core/materials/buildRepresentativeDeliveryRequest.js`,
 * `core/materials/roleConfig.js` → `CERTIFICATE_DELIVERY_MODES`): Ein
 * Durchlauf kann 0-2 unabhängige Empfänger-Mails (`recipientMailParts`)
 * und 0-2 unabhängige humbee-Dokumentations-Mails (`humbeeMailParts`)
 * erzeugen — jeweils höchstens eine für `kind: "materials"` und eine
 * für `kind: "certificate"`. JEDER Teil wird als EIGENER, unabhängiger
 * Request verschickt (kein künstliches Zusammenfassen in einem
 * Request, keine künstliche Verzögerung zwischen den Requests) — das
 * ist gerade die Lösung für das Payload-Limit-Problem, das ein
 * kombiniertes "alles in einer Mail"-ZIP verursacht hat.
 *
 * WICHTIG — weiterhin zwei Maßnahmen gegen das Vercel-Payload-Limit:
 *
 * 1) Jeder `recipientMailParts`-Eintrag und jeder `humbeeMailParts`-
 *    Eintrag wird als eigener Request gesendet (weiterhin: die
 *    humbee-Materialien-Mail enthält dieselben Materialien zusätzlich
 *    als Einzeldateien statt als ZIP, kann also für sich genommen groß
 *    werden).
 * 2) Die Anhänge einer einzelnen humbee-Mail werden bei Bedarf auf
 *    mehrere Mails aufgeteilt (`chunkAttachments`), falls schon sie
 *    ALLEIN das Limit überschreiten würde — mit fortlaufender
 *    "(Teil n/m)"-Kennzeichnung im Betreff.
 *
 * Jede Empfänger-Mail bekommt IMMER genau EINEN Anhang (ZIP bei
 * Materialien, PDF bei der Urkunde) — keine Aufteilung. Ist der Anhang
 * allein zu groß, meldet `sendPart` das mit einer konkreten,
 * verständlichen Fehlermeldung statt eines kryptischen Plattform-413.
 *
 * @param {{
 *   recipientMailParts: Array<{ kind: "materials"|"certificate", to: string, subject: string, text: string, html: string, attachmentFilename: string, attachmentBlob: Blob }>,
 *   humbeeMailParts: Array<{ kind: "materials"|"certificate", to: string, subject: string, text: string, attachments: Array<{ filename: string, content: Blob }> }>
 * }} request Ergebnis von `buildRepresentativeDeliveryRequest()`.
 * @returns {Promise<{
 *   ok: boolean,
 *   recipientResults: Array<{ kind: "materials"|"certificate", success: boolean, messageId?: string, error?: string }>,
 *   humbeeResults: Array<{ kind: "materials"|"certificate", success: boolean, messageId?: string, error?: string }>
 * }>}
 */
export async function sendRepresentativeMaterials(request) {
  const recipientMailParts = request?.recipientMailParts ?? [];
  const humbeeMailParts = request?.humbeeMailParts ?? [];

  const [recipientResults, humbeeResults] = await Promise.all([
    Promise.all(recipientMailParts.map((part) => sendRecipientPart(part))),
    Promise.all(humbeeMailParts.map((part) => sendHumbee(part))),
  ]);

  const ok = [...recipientResults, ...humbeeResults].every((result) => result.success);

  return { ok, recipientResults, humbeeResults };
}

async function sendRecipientPart(part) {
  const result = await sendPart({
    metadata: {
      kind: "recipient",
      to: part.to,
      subject: part.subject,
      text: part.text,
      html: part.html,
      zipFilename: part.attachmentFilename,
    },
    fileEntries: [{ filename: part.attachmentFilename, blob: part.attachmentBlob }],
    resultKey: "representative",
    label: part.kind === "certificate" ? "Versand der Urkunde" : "Versand der Materialien",
  });
  return { kind: part.kind, ...result };
}

// Vercel begrenzt den Request-Body von Serverless Functions (Node-
// Runtime) auf ~4,5 MB — unabhängig vom Plan, nicht per Konfiguration
// erhöhbar, UNABHÄNGIG von der Kodierung (gilt für die rohen Bytes des
// HTTP-Bodys). Die reale Schwelle wurde per Live-Test gegen Production
// eingegrenzt: 4.400.155 Byte kamen noch durch (200 OK), 4.506.823 Byte
// wurden bereits abgelehnt (413) — die tatsächliche Grenze liegt also
// irgendwo dazwischen. 4.450.000 Byte liegen mittig in diesem Fenster.
// Dieser Wert galt bereits für die Base64/JSON-Architektur und bleibt
// unverändert gültig: er beschreibt das Transport-Limit selbst, nicht
// die Kodierung — nur was dagegen gemessen wird (jetzt die tatsächliche
// Multipart-Bytezahl statt der Base64/JSON-Bytezahl) hat sich geändert.
const MAX_REQUEST_BYTES = 4_450_000;

// Konservative Pauschale für den Overhead eines einzelnen Multipart-
// Teils (Boundary-Zeile + `Content-Disposition`/`Content-Type`-Header)
// beim GRUPPIEREN der humbee-Anhänge (`chunkAttachments`) — reale Werte
// liegen typischerweise bei 80–150 Byte. Wird nur für die Gruppierungs-
// Entscheidung genutzt; die tatsächlich gesendete Gruppe wird vor dem
// Versand zusätzlich exakt vermessen (siehe `sendPart`/`measureFormDataBytes`).
const PART_OVERHEAD_BYTES = 200;

function estimateGroupBytes(metadata, fileEntries) {
  let total = JSON.stringify(metadata).length + PART_OVERHEAD_BYTES;
  for (const entry of fileEntries) {
    total += entry.blob.size + entry.filename.length + PART_OVERHEAD_BYTES;
  }
  return total;
}

/**
 * Baut aus `metadata` (JSON-Feld) und `fileEntries` (Dateiteile) ein
 * `FormData`-Objekt — `Content-Type` wird bewusst NICHT manuell
 * gesetzt: der Browser (bzw. `undici` in Node) erzeugt die korrekte
 * Multipart-Boundary automatisch, ein manueller Header ohne Boundary
 * würde den Request unlesbar machen.
 */
function buildFormData(metadata, fileEntries) {
  const formData = new FormData();
  formData.append("metadata", JSON.stringify(metadata));
  for (const entry of fileEntries) {
    formData.append("files", entry.blob, entry.filename);
  }
  return formData;
}

/**
 * Exakte Byte-Größe, mit der `formData` tatsächlich über die Leitung
 * ginge — keine Schätzung: `Response` serialisiert `FormData` nach
 * derselben `multipart/form-data`-Kodierung, die `fetch()` beim
 * eigentlichen Versand verwendet (inkl. echter Boundary, Header,
 * Trennzeilen), siehe Vorgabe "nicht nur schätzen".
 */
async function measureFormDataBytes(formData) {
  const buffer = await new Response(formData).arrayBuffer();
  return buffer.byteLength;
}

/**
 * Teilt `attachments` in möglichst wenige Gruppen auf, sodass eine
 * humbee-Mail mit `metadata` plus jeweils einer Gruppe das Byte-Limit
 * einhält. Greedy: sammelt Anhänge, bis der nächste das Limit sprengen
 * würde, beginnt dann eine neue Gruppe. Eine einzelne, für sich
 * genommen zu große Datei bildet ihre eigene (dann zu große) Gruppe —
 * das wird beim Versand dieser Gruppe als eigener, konkreter Fehler
 * sichtbar, statt den gesamten Versand zu blockieren oder still zu
 * verschlucken.
 *
 * @param {Array<{filename: string, content: Blob}>} attachments
 * @param {object} baseMetadata
 * @returns {Array<Array<{filename: string, blob: Blob}>>} Mindestens eine Gruppe (auch bei leeren `attachments`).
 */
function chunkAttachments(attachments, baseMetadata) {
  const fileEntries = attachments.map((att) => ({ filename: att.filename, blob: att.content }));
  const baseBytes = estimateGroupBytes(baseMetadata, []);
  const groups = [];
  let current = [];
  let currentBytes = baseBytes;

  for (const entry of fileEntries) {
    const entryBytes = entry.blob.size + entry.filename.length + PART_OVERHEAD_BYTES;
    if (current.length > 0 && currentBytes + entryBytes > MAX_REQUEST_BYTES) {
      groups.push(current);
      current = [];
      currentBytes = baseBytes;
    }
    current.push(entry);
    currentBytes += entryBytes;
  }

  groups.push(current);
  return groups;
}

/**
 * Sendet eine humbee-Dokumentations-Mail (Materialien ODER Urkunde, je
 * `humbee.kind`), bei Bedarf aufgeteilt auf mehrere Mails (siehe
 * `chunkAttachments`). Gilt nur dann als erfolgreich, wenn ALLE Teile
 * erfolgreich versendet wurden.
 */
async function sendHumbee(humbee) {
  const { attachments, kind, ...restOfHumbee } = humbee;
  const label = kind === "certificate" ? "Dokumentation an humbee (Urkunde)" : "Dokumentation an humbee (Materialien)";
  const baseMetadata = { kind: "humbee", to: restOfHumbee.to, subject: restOfHumbee.subject, text: restOfHumbee.text };
  const groups = chunkAttachments(attachments, baseMetadata);

  if (groups.length === 1) {
    const result = await sendPart({ metadata: baseMetadata, fileEntries: groups[0], resultKey: "humbee", label });
    return { kind, ...result };
  }

  const partResults = await Promise.all(
    groups.map((group, index) =>
      sendPart({
        metadata: { ...baseMetadata, subject: `${restOfHumbee.subject} (Teil ${index + 1}/${groups.length})` },
        fileEntries: group,
        resultKey: "humbee",
        label: `${label} (Teil ${index + 1}/${groups.length})`,
      })
    )
  );

  const allSucceeded = partResults.every((part) => part.success);
  return {
    kind,
    success: allSucceeded,
    messageId: allSucceeded ? partResults.map((part) => part.messageId).filter(Boolean).join(", ") : undefined,
    error: allSucceeded ? undefined : partResults.filter((part) => !part.success).map((part) => part.error).join(" "),
  };
}

/**
 * Sendet einen einzelnen Versandteil (eine Empfänger-Mail ODER eine
 * humbee-Mail, ggf. mit einer Teilmenge der humbee-Anhänge) als
 * `multipart/form-data`-Request an `/api/send-representative-mail`
 * und liefert dessen Teilergebnis unter dem jeweiligen `resultKey`
 * zurück.
 */
async function sendPart({ metadata, fileEntries, resultKey, label }) {
  const formData = buildFormData(metadata, fileEntries);
  const estimatedBytes = await measureFormDataBytes(formData);
  if (estimatedBytes > MAX_REQUEST_BYTES) {
    const mb = (estimatedBytes / 1024 / 1024).toFixed(1);
    const limitMb = (MAX_REQUEST_BYTES / 1024 / 1024).toFixed(1);
    return {
      success: false,
      error: `${label}: Anhänge zu groß für den Mailversand (${mb} MB, Limit ca. ${limitMb} MB). Bitte weniger Materialien gleichzeitig versenden.`,
    };
  }

  let response;
  try {
    response = await fetch("/api/send-representative-mail", {
      method: "POST",
      body: formData,
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
