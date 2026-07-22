import { guessAttachmentMimeType } from "./guessAttachmentMimeType.js";

const LOG_PREFIX = "[send-representative-mail]";

/**
 * Baut eine einzelne, datensparsame Log-Zeile. Enthält ausschließlich
 * technische Metadaten (Vorgang, Lauf-/Request-ID, SMTP-Response-Code,
 * SMTP-Message-ID, Anzahl/Typen der Anhänge, Fehlerkategorie) —
 * NIEMALS Namen, E-Mail-Adressen, IFK-ID, Bundesland/Region, Betreff,
 * Dateinamen, Mailtext, Dateiinhalte oder Zugangsdaten.
 */
function logLine(logger, message, meta, runId) {
  const parts = [`${LOG_PREFIX} ${message}`];
  if (runId) {
    parts.push(`runId=${runId}`);
  }
  for (const [key, value] of Object.entries(meta ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      parts.push(`${key}=${value}`);
    }
  }
  logger.log(parts.join(" "));
}

function extractSmtpResponseCode(response) {
  if (typeof response !== "string") {
    return undefined;
  }
  const match = response.match(/^(\d{3})/);
  return match ? match[1] : undefined;
}

async function sendOne({ label, startMessage, acceptedMessage, failedMessage, failureError, mail, attachmentTypes, sendMail, logger, runId }) {
  const meta = { attachmentCount: attachmentTypes.length, attachmentTypes: attachmentTypes.join(",") };

  logLine(logger, startMessage, meta, runId);

  try {
    const info = await sendMail(mail);

    if (Array.isArray(info?.rejected) && info.rejected.length > 0) {
      throw new Error(`${label} recipient rejected by mail server`);
    }

    const messageId = typeof info?.messageId === "string" ? info.messageId : undefined;
    logLine(
      logger,
      acceptedMessage,
      { ...meta, smtpResponseCode: extractSmtpResponseCode(info?.response), messageId },
      runId
    );

    return { success: true, messageId };
  } catch (err) {
    logLine(logger, failedMessage, { ...meta, errorCategory: err instanceof Error ? err.name : "unknown_error" }, runId);
    return { success: false, error: failureError };
  }
}

/**
 * Versendet die Repräsentanten-Mail (ZIP-Anhang) und die separate
 * Dokumentations-Mail an humbee (Einzeldateien, keine ZIP-Datei) als
 * zwei unabhängige, jeweils eigenständig protokollierte Versand-
 * vorgänge. Reine, DOM-freie Orchestrierung — der eigentliche
 * SMTP-Versand ist über `deps.sendMail` injizierbar, damit dieses
 * Modul ohne echten Mailserver testbar ist (Produktionsverhalten
 * bleibt bei Standardwerten unverändert).
 *
 * Beide Versandversuche werden immer durchgeführt, unabhängig vom
 * Ergebnis des jeweils anderen — ein Fehlschlag der Repräsentanten-
 * Mail überspringt den humbee-Versand nicht (und umgekehrt).
 *
 * @param {object} params
 * @param {{ to: string, subject: string, text: string, html: string, zipFilename: string, zipContent: Buffer }} params.recipient
 * @param {{ to: string, subject: string, text: string, attachments: Array<{ filename: string, content: Buffer }> }} params.humbee
 * @param {(mailOptions: object) => Promise<{ messageId?: string, response?: string, rejected?: string[] }>} params.sendMail
 *   Versendet eine einzelne Mail (z. B. `transporter.sendMail`,
 *   ohne `from` — wird vom Aufrufer ergänzt). Muss bei einer vom
 *   Mailserver abgelehnten Adresse entweder werfen oder `rejected`
 *   mit der/den abgelehnten Adresse(n) befüllen.
 * @param {{ log(message: string): void }} [params.logger] Standard: `console`.
 * @param {string} [params.runId] Optionale Lauf-/Request-ID zur
 *   Korrelation mehrerer Log-Zeilen desselben Versands (z. B.
 *   `x-vercel-id`).
 * @returns {Promise<{
 *   ok: boolean,
 *   representative: { success: boolean, messageId?: string, error?: string },
 *   humbee: { success: boolean, messageId?: string, error?: string }
 * }>}
 */
export async function deliverRepresentativeMaterials({ recipient, humbee, sendMail, logger = console, runId } = {}) {
  const representative = await sendOne({
    label: "representative",
    startMessage: "representative mail delivery started",
    acceptedMessage: "representative mail delivery accepted",
    failedMessage: "representative mail delivery failed",
    failureError: "Versand an Empfänger fehlgeschlagen. Bitte versuche es später erneut.",
    mail: {
      to: recipient.to,
      subject: recipient.subject,
      text: recipient.text,
      html: recipient.html,
      attachments: [{ filename: recipient.zipFilename, content: recipient.zipContent, contentType: "application/zip" }],
    },
    attachmentTypes: ["application/zip"],
    sendMail,
    logger,
    runId,
  });

  const humbeeAttachmentTypes = humbee.attachments.map((att) => guessAttachmentMimeType(att.filename));

  const humbeeResult = await sendOne({
    label: "humbee",
    startMessage: "humbee mail delivery started",
    acceptedMessage: "humbee mail delivery accepted",
    failedMessage: "humbee mail delivery failed",
    failureError: "Dokumentation an humbee fehlgeschlagen.",
    mail: {
      to: humbee.to,
      subject: humbee.subject,
      text: humbee.text,
      attachments: humbee.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: guessAttachmentMimeType(att.filename),
      })),
    },
    attachmentTypes: humbeeAttachmentTypes,
    sendMail,
    logger,
    runId,
  });

  return {
    ok: representative.success && humbeeResult.success,
    representative,
    humbee: humbeeResult,
  };
}
