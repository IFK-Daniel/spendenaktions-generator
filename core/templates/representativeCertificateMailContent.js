import { ROLE_KEYS, getRoleLabel } from "../materials/roleConfig.js";
import { buildIfkHtmlEmail } from "./ifkHtmlEmail.js";
import { buildIfkSignatureHtml } from "./ifkSignature.js";

/**
 * Mailinhalt der EIGENEN, separaten Repräsentanten-Urkunden-Mail
 * (siehe `core/materials/roleConfig.js`, `CERTIFICATE_DELIVERY_MODES.SEPARATE_EMAIL`,
 * aktuell nur für `representative`). Die Urkunde ist eine persönliche
 * Auszeichnung/Ernennungsurkunde, kein Marketingmaterial — deshalb
 * bewusst eine eigene, wertigere Mail statt eines Absatzes in der
 * Materialien-Mail (`representativeMailContent.js`). Bewusst
 * eigenständiges Modul statt eines Parameters dort: unterschiedlicher
 * Ton, unterschiedlicher Betreff, unterschiedlicher Anhang (nur die
 * Urkunde, kein ZIP).
 *
 * Nur für `representative` genutzt — andere Rollen haben
 * `certificateDeliveryMode: "blocked"` und erreichen diesen Code-Pfad
 * nicht (siehe `core/materials/buildRepresentativeDeliveryRequest.js`).
 */

/**
 * Betreff, geschlechtsabhängig ("Repräsentant"/"Repräsentantin").
 * @param {object} params
 * @param {"male" | "female" | undefined} params.gender
 * @returns {string}
 */
export function buildRepresentativeCertificateMailSubject({ gender } = {}) {
  const roleLabel = getRoleLabel(ROLE_KEYS.REPRESENTATIVE, gender);
  return `Deine Urkunde als ${roleLabel} von It's for Kids`;
}

function buildBodyParagraphs({ firstName, gender }) {
  const roleLabel = getRoleLabel(ROLE_KEYS.REPRESENTATIVE, gender);
  return [
    `Hallo ${firstName},`,
    `wir freuen uns sehr, dass du It's for Kids als ${roleLabel} unterstützt.`,
    "Mit deiner Urkunde möchten wir deine Ernennung auch ganz offiziell festhalten.",
    "Wir wünschen dir viel Freude damit – und vor allem viele besondere Begegnungen und Erlebnisse als Teil von It's for Kids.",
  ];
}

/**
 * Klartext-Mailtext.
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @returns {string}
 */
export function buildRepresentativeCertificateMailText({ firstName, gender }) {
  return [...buildBodyParagraphs({ firstName, gender }), "Herzliche Grüße", "Dein Team von It's for Kids"].join("\n\n");
}

/**
 * HTML-Mailtext, mit derselben IFK-Signatur wie die übrigen
 * Wegbegleiter-Mails.
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @param {string} params.logoUrl
 * @returns {string}
 */
export function buildRepresentativeCertificateMailHtml({ firstName, gender, logoUrl }) {
  const bodyHtml = buildIfkHtmlEmail({ logoUrl, paragraphs: buildBodyParagraphs({ firstName, gender }) });
  const signatureHtml = buildIfkSignatureHtml({ logoUrl });
  return `${bodyHtml}\n${signatureHtml}`;
}
