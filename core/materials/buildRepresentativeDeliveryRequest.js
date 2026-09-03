import { isValidEmail } from "../mail/validateEmail.js";
import { encodeAttachmentBase64 } from "../mail/encodeAttachmentBase64.js";
import {
  buildRepresentativeMailSubject,
  buildRepresentativeMailText,
  buildRepresentativeMailHtml,
} from "../templates/representativeMailContent.js";
import { buildHumbeeMailSubject, buildHumbeeMailText } from "../templates/humbeeMailContent.js";

const HUMBEE_RECIPIENT = "office@its-for-kids.de";

/**
 * Maschinenlesbare Fehlerursachen der Empfängerauflösung. Die
 * Aufrufer-UI bildet diese auf verständliche Meldungen ab — der
 * technische `Error.message` (mit Funktionsnamen) erscheint nur im Log.
 */
export const RECIPIENT_ERROR_CODES = Object.freeze({
  COMPANION_EMAIL_INVALID: "companion_email_invalid",
  ALTERNATIVE_EMAIL_INVALID: "alternative_email_invalid",
});

function recipientError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Ermittelt die Empfängeradresse für den direkten Materialversand an
 * einen Wegbegleiter — rollenunabhängig (Repräsentant, Botschafter,
 * Kurator, Beirat, Fachrat, Wirtschaftsrat).
 *
 * Maßgeblich ist ausschließlich die übergebene, AKTUELL im Formular
 * sichtbare Adresse (`companionEmail`) — kein Wert aus dem Manifest,
 * kein Snapshot aus dem Zeitpunkt der Materialerzeugung, kein alter
 * OCR-/Screenshot-Wert. Bei Angabe einer nicht-leeren abweichenden
 * Adresse (`alternativeEmail`) gewinnt diese. Beide werden über die
 * bestehende `core/mail/validateEmail.js` geprüft.
 *
 * @param {object} params
 * @param {string} [params.companionEmail] Der aktuelle Wert des
 *   Wegbegleiter-E-Mail-Feldes.
 * @param {string} [params.alternativeEmail] Der aktuelle Wert des
 *   Feldes „Abweichende E-Mail-Adresse“.
 * @returns {string}
 * @throws {Error} Mit `code` aus `RECIPIENT_ERROR_CODES`, wenn die
 *   maßgebliche Adresse fehlt oder ungültig ist.
 */
export function resolveCompanionRecipient({ companionEmail, alternativeEmail } = {}) {
  if (typeof alternativeEmail === "string" && alternativeEmail.trim() !== "") {
    const trimmed = alternativeEmail.trim();
    if (!isValidEmail(trimmed)) {
      throw recipientError(
        "resolveCompanionRecipient: ungültige abweichende E-Mail-Adresse.",
        RECIPIENT_ERROR_CODES.ALTERNATIVE_EMAIL_INVALID
      );
    }
    return trimmed;
  }

  const trimmedCompanion = typeof companionEmail === "string" ? companionEmail.trim() : "";
  if (!isValidEmail(trimmedCompanion)) {
    throw recipientError(
      "resolveCompanionRecipient: keine gültige E-Mail-Adresse im Formular hinterlegt.",
      RECIPIENT_ERROR_CODES.COMPANION_EMAIL_INVALID
    );
  }
  return trimmedCompanion;
}

/**
 * @deprecated Alter Name aus der reinen Repräsentanten-Phase. Der
 * direkte Versand ist inzwischen für alle Wegbegleiter-Rollen gültig —
 * bitte `resolveCompanionRecipient` verwenden. Bleibt als dünner
 * Adapter erhalten, um evtl. externe Aufrufer nicht zu brechen.
 */
export function resolveRepresentativeRecipient({ person, companionEmail, alternativeEmail } = {}) {
  return resolveCompanionRecipient({
    companionEmail: companionEmail ?? person?.email,
    alternativeEmail,
  });
}

/**
 * Baut den vollständigen, versandfertigen Request-Payload für den
 * Materialversand: eine Mail an den Repräsentanten (bzw. die
 * abweichende Adresse) mit dem ZIP-Archiv als einzigem Anhang, sowie
 * eine separate Dokumentations-Mail an humbee mit den tatsächlich
 * erzeugten Materialien als Einzeldateien (keine ZIP-Datei).
 *
 * Reine, DOM-freie Datenzusammenstellung — löst selbst keinen Versand
 * aus (siehe `core/mail/sendRepresentativeMaterials.js`).
 *
 * @param {object} params
 * @param {{ person: { firstName: string, lastName: string, ifkId: string, role?: string, gender?: string, federalState?: string, region?: string, email?: string } }} params.manifest
 *   `person.role` (technischer Wegbegleiter-Schlüssel) steuert die
 *   Rollenbezeichnung in Betreff/Text beider Mails (siehe
 *   `representativeMailContent.js`/`humbeeMailContent.js`).
 * @param {{ filename: string, blob: Blob }} params.zip Ergebnis von
 *   `buildMaterialZip()`.
 * @param {Array<{ filename: string, content: Blob | ArrayBuffer | Uint8Array }>} params.files
 *   Die tatsächlich erzeugten Materialdateien (Ergebnis von
 *   `generateQrMaterials()`) — werden humbee einzeln angehängt.
 * @param {string} [params.companionEmail] Aktueller Wert des
 *   Wegbegleiter-E-Mail-Feldes im Formular — siehe
 *   `resolveCompanionRecipient`. Fällt ausschließlich als
 *   Rückwärtskompatibilität auf `manifest.person.email` zurück, wenn
 *   nicht angegeben.
 * @param {string} [params.alternativeEmail] Siehe `resolveCompanionRecipient`.
 * @param {string} params.logoUrl Für die HTML-Mail an den Wegbegleiter.
 * @returns {Promise<{
 *   recipient: { to: string, subject: string, text: string, html: string, zipFilename: string, zipContent: string },
 *   humbee: { to: string, subject: string, text: string, attachments: Array<{ filename: string, content: string }> }
 * }>}
 * @throws {Error} Siehe `resolveCompanionRecipient`.
 */
export async function buildRepresentativeDeliveryRequest({
  manifest,
  zip,
  files,
  companionEmail,
  alternativeEmail,
  logoUrl,
} = {}) {
  const { person } = manifest;
  const to = resolveCompanionRecipient({
    companionEmail: companionEmail ?? person?.email,
    alternativeEmail,
  });

  const recipient = {
    to,
    subject: buildRepresentativeMailSubject(),
    text: buildRepresentativeMailText({
      firstName: person.firstName,
      gender: person.gender,
      ifkId: person.ifkId,
      role: person.role,
    }),
    html: buildRepresentativeMailHtml({
      firstName: person.firstName,
      gender: person.gender,
      ifkId: person.ifkId,
      role: person.role,
      logoUrl,
    }),
    zipFilename: zip.filename,
    zipContent: await encodeAttachmentBase64(zip.blob),
  };

  const humbeeAttachments = [];
  for (const file of files ?? []) {
    humbeeAttachments.push({
      filename: file.filename,
      content: await encodeAttachmentBase64(file.content),
    });
  }

  const humbee = {
    to: HUMBEE_RECIPIENT,
    subject: buildHumbeeMailSubject({
      federalState: person.federalState,
      region: person.region,
      lastName: person.lastName,
      firstName: person.firstName,
      role: person.role,
    }),
    text: buildHumbeeMailText({ firstName: person.firstName, lastName: person.lastName, ifkId: person.ifkId }),
    attachments: humbeeAttachments,
  };

  return { recipient, humbee };
}
