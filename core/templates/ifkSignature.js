/**
 * Vollständige IFK-HTML-Signatur für Mails an externe Empfänger
 * (aktuell: Repräsentanten-Mail). Enthält bewusst alle vorgegebenen
 * Bestandteile als reines HTML-Fragment, unabhängig von einer
 * Mailprogramm-Signatur — der Versand erfolgt serverseitig, es gibt
 * keinen Mailclient, der eine eigene Signatur ergänzen würde.
 *
 * Bewusst NICHT Teil der humbee-Mail (siehe
 * `core/templates/humbeeMailContent.js`) — dort ausdrücklich keine
 * Signatur.
 */
export function buildIfkSignatureHtml({ logoUrl } = {}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #575756; max-width: 480px;">
      <p>Herzliche Grüße<br />Dein Team von It's for Kids</p>
      <p style="font-style: italic;">
        „Den Schwächsten helfen – heißt, die Gesellschaft stärken“<br />
        (Rainer Koch, Gründer der Stiftung It's for Kids)
      </p>
      <img src="${logoUrl}" alt="Stiftung It's for Kids" width="64" style="display: block; margin: 16px 0;" />
      <p style="font-size: 12px; color: #8a8a89; line-height: 1.6;">
        Stiftung It's for Kids<br />
        Zum Jägerhof 2, 40724 Hilden<br />
        E-Mail: <a href="mailto:info@its-for-kids.de" style="color: #8a8a89;">info@its-for-kids.de</a><br />
        Web: <a href="https://www.its-for-kids.de" style="color: #8a8a89;">www.its-for-kids.de</a><br />
        Spendenkonto IBAN DE48 3008 0000 0228 2288 00<br />
        Vorstand: Rainer Koch (1. Vorsitzender), Tobias Mehwitz (2. Vorsitzender)<br />
        Aufsichtsbehörde Bezirksregierung Düsseldorf<br />
        RegNr 21.13 – St.1820<br />
        <a href="https://www.its-for-kids.de/datenschutz" style="color: #8a8a89;">Datenschutzerklärung</a>
        &middot;
        Datenschutzkontakt: <a href="mailto:info@its-for-kids.de" style="color: #8a8a89;">info@its-for-kids.de</a>
      </p>
      <p style="font-size: 11px; color: #8a8a89; line-height: 1.5;">
        Diese E-Mail kann vertrauliche und/oder rechtlich geschützte Informationen enthalten. Wenn Sie
        nicht der richtige Adressat sind oder diese E-Mail irrtümlich erhalten haben, informieren Sie
        bitte sofort den Absender und vernichten Sie diese E-Mail. Das unerlaubte Kopieren sowie die
        unbefugte Weitergabe dieser E-Mail sind nicht gestattet.
        <br /><br />
        This e-mail may contain confidential and/or privileged information. If you are not the intended
        recipient (or have received this e-mail in error) please notify the sender immediately and
        destroy this e-mail. Any unauthorized copying, disclosure or distribution of the material in
        this e-mail is strictly forbidden.
      </p>
    </div>
  `;
}
