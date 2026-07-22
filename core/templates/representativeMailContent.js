import { getRepresentativeRoleLabel } from "../materials/getRepresentativeRoleLabel.js";
import { buildIfkHtmlEmail } from "./ifkHtmlEmail.js";

const REPRESENTATIVE_MAIL_SUBJECT = "Deine personalisierten Materialien von It's for Kids";

/**
 * Betreff der Mail an den Repräsentanten. Konstant, aber als Funktion
 * bereitgestellt, damit Aufrufer nicht auf einen hartcodierten String
 * angewiesen sind und sich das Format bei Bedarf zentral ändern lässt.
 */
export function buildRepresentativeMailSubject() {
  return REPRESENTATIVE_MAIL_SUBJECT;
}

function buildParagraphs({ firstName, gender, ifkId }) {
  const role = getRepresentativeRoleLabel(gender);

  return [
    `Hallo ${firstName},`,
    `anbei erhältst du deine personalisierten Materialien für deinen Einsatz als ${role} von It's for Kids.`,
    "Das ZIP-Archiv enthält alle aktuell verfügbaren Materialien, die speziell für dich erstellt wurden.",
    `Deine persönliche IFK-ID lautet: ${ifkId}. Die IFK-ID dient ausschließlich der internen eindeutigen Zuordnung. Deshalb ist sie beispielsweise auch im Verwendungszweck des GiroCodes für die Banking-App enthalten.`,
    "Solltest du Fragen haben oder weitere Unterstützung benötigen, sind wir jederzeit gerne für dich da.",
    "Vielen Dank für dein Engagement. Gemeinsam schenken wir Kindern Hoffnung und Zukunft.",
    "Herzliche Grüße",
    "Dein Team von It's for Kids",
  ];
}

/**
 * Klartext-Mailtext für die Repräsentanten-Mail. Rollenbezeichnung
 * ("Repräsentant"/"Repräsentantin") über `getRepresentativeRoleLabel`.
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @param {string} params.ifkId
 * @returns {string}
 */
export function buildRepresentativeMailText({ firstName, gender, ifkId }) {
  return buildParagraphs({ firstName, gender, ifkId }).join("\n\n");
}

/**
 * HTML-Mailtext für die Repräsentanten-Mail. Nutzt den gemeinsamen
 * `buildIfkHtmlEmail`-Baustein (bestehende IFK-HTML-Signatur/Branding),
 * damit das Logo/Markup nicht dupliziert wird.
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @param {string} params.ifkId
 * @param {string} params.logoUrl
 * @returns {string}
 */
export function buildRepresentativeMailHtml({ firstName, gender, ifkId, logoUrl }) {
  return buildIfkHtmlEmail({
    logoUrl,
    paragraphs: buildParagraphs({ firstName, gender, ifkId }),
  });
}
