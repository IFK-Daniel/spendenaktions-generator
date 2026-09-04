import { isValidEmail } from "../mail/validateEmail.js";
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
 * Verschmilzt die verbindlichen, aktuell im Formular sichtbaren
 * Wegbegleiter-Daten (`companion`) über die aus dem Manifest bekannten
 * Personendaten. Nur nicht-leere Werte aus `companion` überschreiben —
 * so bleiben Altaufrufe ohne `companion` unverändert, und ein leeres
 * Feld setzt keinen vorhandenen Manifest-Wert auf `undefined`.
 *
 * Fachlich: Die Personendaten (Typ, Name, IFK-ID) gehören zum
 * Wegbegleiter und sind unabhängig davon, an welche Adresse versendet
 * wird. `companion` ist für beide Versandwege identisch — nur der
 * separat aufgelöste Empfänger (`to`) unterscheidet sich.
 */
function mergeCompanionData(manifestPerson = {}, companion) {
  const merged = { ...manifestPerson };
  if (!companion || typeof companion !== "object") return merged;
  for (const [key, value] of Object.entries(companion)) {
    const normalized = typeof value === "string" ? value.trim() : value;
    if (normalized !== undefined && normalized !== null && normalized !== "") {
      merged[key] = normalized;
    }
  }
  return merged;
}

/**
 * Fail-safe gegen "undefined"/"null"/"NaN" in einer Benutzer-Mail:
 * scannt die menschenlesbaren Textfelder (nicht die base64-Anhänge) und
 * bricht mit klarer Fehlermeldung ab, bevor eine solche Mail versendet
 * wird. Fehlende Pflichtangaben müssen vorher entweder den betroffenen
 * Satz weglassen oder den Versand blockieren.
 */
const PLACEHOLDER_TOKEN_RE = /\b(undefined|null|NaN)\b/;

function assertNoPlaceholders(fields) {
  for (const [label, value] of Object.entries(fields)) {
    if (typeof value === "string" && PLACEHOLDER_TOKEN_RE.test(value)) {
      throw new Error(
        `buildRepresentativeDeliveryRequest: Platzhalterwert im Mailfeld "${label}" — Versand abgebrochen.`
      );
    }
  }
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
 *   `buildMaterialZip()`. Der Blob wird UNVERÄNDERT (kein Base64) in
 *   `recipient.zipBlob` durchgereicht — der eigentliche Versand
 *   (`core/mail/sendRepresentativeMaterials.js`) überträgt ihn als
 *   `multipart/form-data`-Dateiteil statt als Base64-String im JSON
 *   (siehe dortige Doku zur Vercel-Payload-Größe).
 * @param {Array<{ filename: string, content: Blob | ArrayBuffer | Uint8Array }>} params.files
 *   Die tatsächlich erzeugten Materialdateien (Ergebnis von
 *   `generateQrMaterials()`) — werden humbee einzeln angehängt.
 * @param {{ firstName?: string, lastName?: string, ifkId?: string, role?: string, gender?: string, email?: string, federalState?: string, region?: string }} [params.companion]
 *   Die AKTUELL im Formular sichtbaren Wegbegleiter-Daten. Verbindliche
 *   Quelle für Anrede, Rollenbezeichnung und IFK-ID in beiden Mails —
 *   unabhängig vom gewählten Empfänger. Nicht-leere Werte überschreiben
 *   die aus dem Manifest bekannten (siehe `mergeCompanionData`); ohne
 *   `companion` bleibt alles wie bisher aus dem Manifest.
 * @param {string} [params.companionEmail] Rückwärtskompatibler
 *   Einzelwert des Wegbegleiter-E-Mail-Feldes. `companion.email` hat
 *   Vorrang; danach dieser Wert; zuletzt `manifest.person.email`.
 * @param {string} [params.alternativeEmail] Siehe `resolveCompanionRecipient`.
 * @param {string} params.logoUrl Für die HTML-Mail an den Wegbegleiter.
 * @param {string[]} [params.flyerSalutationVariants] Die tatsächlich für
 *   diesen Versand erzeugten Flyer-Ansprache-Varianten (z. B. `["du"]`
 *   oder `["du", "sie"]`, siehe `buildFlyerVariantEntries.js`) — leer
 *   oder weggelassen, wenn kein Flyer Teil dieses Versands ist. Steuert
 *   ausschließlich, ob der Mailtext den kurzen Hinweis zur optional
 *   zusätzlich erhältlichen Sie-Version enthält (nur wenn "du" ohne
 *   "sie" enthalten ist — sonst wäre der Hinweis inhaltlich falsch:
 *   entweder gibt es keinen Flyer, oder die Sie-Version ist ohnehin
 *   schon dabei).
 * @returns {Promise<{
 *   recipient: { to: string, subject: string, text: string, html: string, zipFilename: string, zipBlob: Blob },
 *   humbee: { to: string, subject: string, text: string, attachments: Array<{ filename: string, content: Blob }> }
 * }>}
 *   `zipBlob`/`attachment.content` sind rohe `Blob`s (kein Base64) — der
 *   Versand kodiert sie nicht mehr im JSON, sondern überträgt sie als
 *   eigene Dateiteile eines `multipart/form-data`-Requests (siehe
 *   `core/mail/sendRepresentativeMaterials.js`).
 * @throws {Error} Siehe `resolveCompanionRecipient`.
 */
export async function buildRepresentativeDeliveryRequest({
  manifest,
  zip,
  files,
  companion,
  companionEmail,
  alternativeEmail,
  logoUrl,
  flyerSalutationVariants,
} = {}) {
  // Eine einzige, empfängerunabhängige Personendaten-Quelle für beide
  // Mails. Der Empfänger (`to`) wird davon getrennt aufgelöst.
  const person = mergeCompanionData(manifest?.person, companion);
  const to = resolveCompanionRecipient({
    companionEmail: companion?.email ?? companionEmail ?? person.email,
    alternativeEmail,
  });

  const variants = Array.isArray(flyerSalutationVariants) ? flyerSalutationVariants : [];
  const includeFlyerSieHint = variants.includes("du") && !variants.includes("sie");

  const recipient = {
    to,
    subject: buildRepresentativeMailSubject(),
    text: buildRepresentativeMailText({
      firstName: person.firstName,
      gender: person.gender,
      ifkId: person.ifkId,
      role: person.role,
      includeFlyerSieHint,
    }),
    html: buildRepresentativeMailHtml({
      firstName: person.firstName,
      gender: person.gender,
      ifkId: person.ifkId,
      role: person.role,
      logoUrl,
      includeFlyerSieHint,
    }),
    zipFilename: zip.filename,
    zipBlob: zip.blob,
  };

  const humbeeAttachments = [];
  for (const file of files ?? []) {
    humbeeAttachments.push({
      filename: file.filename,
      content: file.content,
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

  assertNoPlaceholders({
    "recipient.subject": recipient.subject,
    "recipient.text": recipient.text,
    "recipient.html": recipient.html,
    "humbee.subject": humbee.subject,
    "humbee.text": humbee.text,
  });

  return { recipient, humbee };
}
