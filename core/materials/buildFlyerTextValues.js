/**
 * Bildet `manifest.person`-Felder auf die generischen `textValues`-
 * Feldschlüssel der Flyer-Vorderseiten-Template-Configs ab (siehe
 * `templates/_shared/representativeFlyerFrontBase.js`, Abschnitt
 * `fields`). Bewusst hier zentralisiert (statt im UI-Code verteilt) —
 * die einzige Stelle, die weiß, dass der Flyer intern zwei Textfelder
 * für den Regionsnamen hat (Kopfzeile + Fließtext, siehe
 * Template-Config-Kommentar). Von `generateFlyerMaterial.js`
 * (Druckerei) UND `generateFlyerHomeSheet.js` (Home) gleichermaßen
 * verwendet — beide brauchen exakt dieselbe Abbildung.
 *
 * Das `region`-Feld mancher Vorlagen steht für den ganzen Satz "für die
 * Region {Region}", nicht nur den Regionsnamen — markiert über
 * `fields.region.regionPrefix` in der jeweiligen Template-Config; hier
 * wird dieser Präfix (falls vorhanden) vor den Regionsnamen gesetzt,
 * damit der Aufrufer keine Kenntnis von der jeweiligen Master-Grafik
 * braucht.
 *
 * @param {{firstName: string, lastName: string, region?: string, phone?: string, email?: string}} person
 * @param {object} templateConfig Vorderseiten-Template-Config, aus der
 *   ein optionaler `fields.region.regionPrefix` gelesen wird.
 * @returns {Record<string, string>}
 */
export function buildFlyerTextValues(person, templateConfig) {
  const name = `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim();
  const region = person?.region ?? "";
  const regionPrefix = templateConfig?.fields?.region?.regionPrefix ?? "";
  return {
    name,
    region: region ? `${regionPrefix}${region}` : "",
    regionInParagraph: region,
    phone: person?.phone ?? "",
    email: person?.email ?? "",
  };
}
