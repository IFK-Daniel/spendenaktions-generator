/**
 * Zentrale Vorlagen für Mail-Inhalte (Betreff, Text, HTML).
 *
 * Geplante Verantwortlichkeit: Aktuell sind Betreff, Text- und
 * HTML-Bausteine der Versand-Mail fest in `api/send-email.js`
 * codiert. Dieses Modul soll perspektivisch die Textbausteine für
 * verschiedene Mail-Typen (z. B. QR-Code-Generator-Mail,
 * Materialgenerator-Mail, interne Info-Mail) zentral und parametrisiert
 * bereitstellen, damit mehrere Generatoren dieselben Bausteine
 * wiederverwenden können, ohne Duplikate zu pflegen.
 *
 * Wichtig: Der bestehende Mailversand (`api/send-email.js`) wird durch
 * dieses Modul NICHT verändert oder ersetzt. Die Migration der
 * bestehenden Texte hierher ist ein separater, künftiger Schritt.
 *
 * Geplanter Datenfluss: Serverseitiger Handler (z. B.
 * `api/send-email.js` oder künftige Endpunkte) importiert eine
 * Template-Funktion, übergibt fachliche Daten (z. B. Kampagnentitel)
 * und erhält Betreff/Text/HTML zurück, die dann per `nodemailer`
 * versendet werden.
 *
 * Abhängigkeiten (geplant): keine externen Bibliotheken vorgesehen;
 * reine String-Zusammensetzung, DOM-frei und serverseitig nutzbar.
 *
 * TODO: Bestehende Text-/HTML-Bausteine aus `api/send-email.js`
 *       identifizieren und als parametrisierte Templates hierher
 *       migrieren (separater Schritt, nicht Teil dieses Umbaus).
 * TODO: Struktur für mehrere Mail-Typen festlegen (z. B. je ein Template
 *       pro Anwendungsfall statt einer monolithischen Funktion).
 * TODO: Mehrsprachigkeit klären (aktuell nur Deutsch).
 *
 * @param {object} data
 * @returns {{ subject: string, text: string, html: string }}
 */
export function buildDonationMaterialsMail(data) {
  throw new Error("buildDonationMaterialsMail: noch nicht implementiert");
}
