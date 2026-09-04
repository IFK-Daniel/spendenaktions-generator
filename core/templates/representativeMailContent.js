import { ROLE_KEYS, getRoleLabel, isValidRoleKey } from "../materials/roleConfig.js";
import { buildIfkHtmlEmail } from "./ifkHtmlEmail.js";
import { buildIfkSignatureHtml } from "./ifkSignature.js";

/**
 * Rollenbezeichnung für die Wegbegleiter-Mail. Nimmt den technischen
 * Rollen-Schlüssel (`manifest.person.role`) plus Geschlecht und
 * delegiert an die zentrale Rollen-Konfiguration
 * (`core/materials/roleConfig.js`) — Botschafter/Botschafterin,
 * "Mitglied des Beirats" usw. kommen so ausschließlich von dort. Fehlt
 * die Rolle (Altaufrufe), wird `representative` angenommen, damit sich
 * das bisherige Verhalten nicht ändert — es entsteht NIE eine falsche
 * Repräsentanten-Anrede für eine tatsächlich übergebene andere Rolle.
 */
function mailRoleLabel(role, gender) {
  return getRoleLabel(isValidRoleKey(role) ? role : ROLE_KEYS.REPRESENTATIVE, gender);
}

const REPRESENTATIVE_MAIL_SUBJECT = "Deine personalisierten Materialien von It's for Kids";

/**
 * Betreff der Mail an den Repräsentanten. Konstant, aber als Funktion
 * bereitgestellt, damit Aufrufer nicht auf einen hartcodierten String
 * angewiesen sind und sich das Format bei Bedarf zentral ändern lässt.
 */
export function buildRepresentativeMailSubject() {
  return REPRESENTATIVE_MAIL_SUBJECT;
}

function buildBodyParagraphs({ firstName, gender, ifkId, role, includeFlyerSieHint }) {
  const roleLabel = mailRoleLabel(role, gender);
  // Die IFK-ID gehört zur Person, nicht zum gewählten Empfänger. Ist im
  // Formular eine ID hinterlegt, MUSS exakt dieser Wert erscheinen; fehlt
  // sie (z. B. reine Urkunden-Erzeugung ohne IFK-ID-Pflicht), wird der
  // Satz ersatzlos weggelassen — niemals "undefined"/"null" ausgeben.
  const trimmedIfkId = typeof ifkId === "string" ? ifkId.trim() : "";

  return [
    `Hallo ${firstName},`,
    `anbei erhältst du deine personalisierten Materialien für deinen Einsatz als ${roleLabel} von It's for Kids.`,
    "Das ZIP-Archiv enthält alle aktuell verfügbaren Materialien, die speziell für dich erstellt wurden.",
    // Nur relevant, wenn tatsächlich ein Flyer OHNE Sie-Variante
    // versendet wurde (Standardfall seit dem Standard-Starter-Set,
    // siehe `core/materials/roleConfig.js`, `DEFAULT_FLYER_SALUTATION_VARIANTS`)
    // — der Aufrufer (`buildRepresentativeDeliveryRequest.js`) berechnet
    // dieses Flag aus den tatsächlich erzeugten Ansprache-Varianten,
    // damit dieser Hinweis nie fälschlich erscheint, wenn ohnehin schon
    // beide Varianten verschickt wurden oder gar kein Flyer dabei ist.
    includeFlyerSieHint
      ? "Da wir bei It's for Kids grundsätzlich per Du sind, erhältst du deinen Flyer standardmäßig in der Du-Version. Wenn du zusätzlich eine Variante mit der Anrede „Sie“ benötigst, erstellen wir sie dir gerne separat."
      : null,
    trimmedIfkId
      ? `Deine persönliche IFK-ID lautet: ${trimmedIfkId}. Die IFK-ID dient ausschließlich der internen eindeutigen Zuordnung. Deshalb ist sie beispielsweise auch im Verwendungszweck des GiroCodes für die Banking-App enthalten.`
      : null,
    "Solltest du Fragen haben oder weitere Unterstützung benötigen, sind wir jederzeit gerne für dich da.",
    "Vielen Dank für dein Engagement. Gemeinsam schenken wir Kindern Hoffnung und Zukunft.",
  ].filter((paragraph) => paragraph !== null);
}

/**
 * Klartext-Mailtext für die Wegbegleiter-Mail. Rollenbezeichnung über
 * die zentrale Rollen-Konfiguration (`mailRoleLabel`) — z. B.
 * "Repräsentant"/"Repräsentantin", "Botschafter"/"Botschafterin",
 * "Mitglied des Beirats". Schließt mit Grußformel — die ausführliche
 * IFK-Signatur (Zitat, Anschrift, Vorstand, Datenschutz- und
 * Vertraulichkeitshinweise) ist bewusst nur Teil der HTML-Version
 * (siehe `buildRepresentativeMailHtml`).
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {"male" | "female" | undefined} params.gender
 * @param {string} params.ifkId
 * @param {string} [params.role] Technischer Rollen-Schlüssel
 *   (`manifest.person.role`). Ohne Angabe: `representative`.
 * @param {boolean} [params.includeFlyerSieHint] Ob der kurze Hinweis
 *   zur optional zusätzlich erhältlichen Sie-Version erscheinen soll —
 *   `true`, wenn ein Flyer OHNE Sie-Variante versendet wurde.
 * @returns {string}
 */
export function buildRepresentativeMailText({ firstName, gender, ifkId, role, includeFlyerSieHint }) {
  return [
    ...buildBodyParagraphs({ firstName, gender, ifkId, role, includeFlyerSieHint }),
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
 * @param {string} [params.role] Technischer Rollen-Schlüssel
 *   (`manifest.person.role`). Ohne Angabe: `representative`.
 * @param {string} params.logoUrl
 * @param {boolean} [params.includeFlyerSieHint] Siehe `buildRepresentativeMailText`.
 * @returns {string}
 */
export function buildRepresentativeMailHtml({ firstName, gender, ifkId, role, logoUrl, includeFlyerSieHint }) {
  const bodyHtml = buildIfkHtmlEmail({
    logoUrl,
    paragraphs: buildBodyParagraphs({ firstName, gender, ifkId, role, includeFlyerSieHint }),
  });
  const signatureHtml = buildIfkSignatureHtml({ logoUrl });

  return `${bodyHtml}\n${signatureHtml}`;
}
