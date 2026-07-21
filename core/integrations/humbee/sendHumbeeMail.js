/**
 * Anbindung an die externe Plattform "humbee" für den Mailversand.
 *
 * Geplante Verantwortlichkeit: Kapselung der Kommunikation mit der
 * humbee-API (Authentifizierung, Request-/Response-Format), damit
 * andere Core-Module (z. B. `core/templates/mailTemplates.js`) oder
 * Apps humbee nutzen können, ohne die Integrationsdetails zu kennen.
 * Ob humbee den bestehenden `nodemailer`-Versand in `api/send-email.js`
 * künftig ersetzt oder ergänzt, ist noch nicht entschieden.
 *
 * Geplanter Datenfluss: App/Server ruft `sendHumbeeMail(payload)` mit
 * Empfänger, Betreff, Inhalt und optionalen Anhängen auf → Modul baut
 * daraus einen humbee-API-Request → Modul liefert Erfolg/Fehler an den
 * Aufrufer zurück (analog zum Rückgabeformat von
 * `core/mail/sendGeneratedMaterials.js`).
 *
 * Abhängigkeiten (geplant): humbee-API-Zugangsdaten (vermutlich über
 * Umgebungsvariablen, analog zu den bestehenden SMTP_*-Variablen in
 * `api/send-email.js`), noch zu definierender HTTP-Client.
 *
 * TODO: humbee-API-Dokumentation sichten und Request-/Response-Format
 *       festlegen.
 * TODO: Authentifizierungsmechanismus klären (API-Key, OAuth, ...).
 * TODO: Verhältnis zum bestehenden `nodemailer`-Versand klären
 *       (Ersatz vs. zusätzlicher Kanal).
 * TODO: Implementierung des eigentlichen API-Aufrufs.
 *
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.subject
 * @param {string} [payload.text]
 * @param {string} [payload.html]
 * @param {Array<{ filename: string, content: string }>} [payload.attachments]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendHumbeeMail(payload) {
  throw new Error("sendHumbeeMail: noch nicht implementiert");
}
