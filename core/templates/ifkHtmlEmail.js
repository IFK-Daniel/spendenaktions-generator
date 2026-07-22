/**
 * Gemeinsamer HTML-Rahmen für Mails der Stiftung It's for Kids: Logo
 * oben, Fließtext-Absätze darunter. Entspricht optisch exakt dem
 * bestehenden HTML-Aufbau in `api/send-email.js` (dort weiterhin
 * unverändert inline vorhanden, da diese Datei laut Vorgabe nicht
 * verändert werden darf). Neue Mailtypen nutzen ab jetzt diesen
 * gemeinsamen Baustein ("IFK-HTML-Signatur"), statt das Markup ein
 * drittes Mal zu duplizieren.
 *
 * @param {object} params
 * @param {string} params.logoUrl Absolute URL zum IFK-Logo.
 * @param {string[]} params.paragraphs Fließtext-Absätze, jeweils ohne
 *   eigenes HTML-Markup (werden unverändert in `<p>` gewrappt).
 * @returns {string}
 */
export function buildIfkHtmlEmail({ logoUrl, paragraphs }) {
  const body = (paragraphs ?? []).map((paragraph) => `<p>${paragraph}</p>`).join("\n      ");

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #575756; max-width: 480px;">
      <img src="${logoUrl}" alt="Stiftung It's for Kids" width="96" style="display: block; margin-bottom: 24px;" />
      ${body}
    </div>
  `;
}
