import { getRepresentativeRoleLabel } from "../materials/getRepresentativeRoleLabel.js";
import { buildIfkHtmlEmail } from "./ifkHtmlEmail.js";
import { buildIfkSignatureHtml } from "./ifkSignature.js";

const REPRESENTATIVE_MAIL_SUBJECT = "Deine personalisierten Materialien von It's for Kids";

/**
 * Betreff der Mail an den Repräsentanten. Konstant, aber als Funktion
 * bereitgestellt, damit Aufrufer nicht auf einen hartcodierten String
 * angewiesen sind und sich das Format bei Bedarf zentral ändern lässt.
 */
export function buildRepresentativeMailSubject() {
  return REPRESENTATIVE_MAIL_SUBJECT;
}

function buildBodyParagraphs({ firstName, gender, ifkId }) {
  const role = getRepresentativeRoleLabel(gender);

  return [
    `Hallo ${firstName},`,
    `anbei erhältst du deine personalisierten Materialien für deinen Einsatz als ${role} von It's for Kids.`,
    "Das ZIP-Archiv enthält alle aktuell verfügbaren Materialien, die speziell für dich erstellt wurden.",
    `Deine persönliche IFK-ID lautet: ${ifkId}. Die IFK-ID dient ausschließlich der internen eindeutigen Zuordnung. Deshalb ist sie beispielsweise auch im Verwendungszweck des GiroCodes für die Banking-App enthalten.`,
    "Solltest du Fragen haben oder weitere Unterstützung benötigen, sind wir jederzeit gerne für dich da.",
    "Vielen Dank für dein Engagement. Gemeinsam schenken wir Kindern Hoffnung und Zukunft.",
  ];
}

/**
 * Klartext-Mailtext für die Repräsentanten-Mail. Rollenbezeichnung
 * ("Repräsentant"/"Repräsentantin") über `getRepresentativeRoleLabel`.
 * Schließt mit Grußformel — die ausführliche IFK-Signatur (Zitat,
 * Anschrift, Vorstand, Datenschutz- und Vertraulichkeitshinweise) ist
 * bewusst nur Teil der HTML-Version (siehe `buildRepresentativeMailHtml`).
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @param {string} params.ifkId
 * @returns {string}
 */
export function buildRepresentativeMailText({ firstName, gender, ifkId }) {
  return [
    ...buildBodyParagraphs({ firstName, gender, ifkId }),
    "Herzliche Grüße",
    "Dein Team von It's for Kids",
  ].join("\n\n");
}

/**
 * HTML-Mailtext für die Repräsentanten-Mail. Nutzt den gemeinsamen
 * `buildIfkHtmlEmail`-Baustein für Logo + Fließtext sowie die
 * vollständige `buildIfkSignatureHtml`-Signatur (Grußformel, Zitat,
 * Logo, Anschrift, Spendenkonto, Vorstand, Aufsichtsbehörde,
 * Datenschutz- und Vertraulichkeitshinweise) direkt im Anschluss.
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @param {string} params.ifkId
 * @param {string} params.logoUrl
 * @returns {string}
 */
export function buildRepresentativeMailHtml({ firstName, gender, ifkId, logoUrl }) {
  const bodyHtml = buildIfkHtmlEmail({
    logoUrl,
    paragraphs: buildBodyParagraphs({ firstName, gender, ifkId }),
  });
  const signatureHtml = buildIfkSignatureHtml({ logoUrl });

  return `${bodyHtml}\n${signatureHtml}`;
}
