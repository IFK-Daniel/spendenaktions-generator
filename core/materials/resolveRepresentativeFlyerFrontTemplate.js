/**
 * Zentrale, datengetriebene Auflösung der Repräsentanten-Flyer-
 * VORDERSEITE anhand von genau zwei Merkmalen: Geschlecht und Ansprache.
 * Ohne Kenntnis konkreter Template-Configs oder PDF-Dateien (die liegen
 * in `templates/flyer-representative-*-front/` und werden erst in
 * `src/intern/generator.js` zugeordnet).
 *
 * Bewusst KEINE vier `if`-Blöcke im Generator: die Zuordnung ist eine
 * einzige verschachtelte Tabelle
 *   `{ female: { du, sie }, male: { du, sie } }`
 * und diese eine Funktion. Die gemeinsame Rückseite
 * (`templates/flyer-shared-back/`) ist NICHT Teil dieser Auflösung —
 * sie ist geschlechts-, ansprache- UND rollenunabhängig und wird separat
 * eingebunden.
 *
 * Kein stiller Fallback, keine alte Vorlage: fehlendes/unbekanntes
 * Geschlecht oder fehlende/unbekannte Ansprache wirft mit klarer
 * Meldung. `female` liefert nie eine männliche Vorlage, `du` nie eine
 * Sie-Vorlage.
 *
 * @template T
 * @param {{ female?: { du?: T, sie?: T }, male?: { du?: T, sie?: T } }} templatesByGenderAndSalutation
 * @param {"male" | "female" | undefined} gender
 * @param {"du" | "sie" | undefined} salutation
 * @returns {T}
 * @throws {Error} Bei fehlender Tabelle, ungültigem `gender` oder
 *   ungültiger `salutation`, oder wenn für die (gültige) Kombination
 *   keine Vorlage hinterlegt ist.
 */
export function resolveRepresentativeFlyerFrontTemplate(templatesByGenderAndSalutation, gender, salutation) {
  if (!templatesByGenderAndSalutation || typeof templatesByGenderAndSalutation !== "object") {
    throw new Error(
      "resolveRepresentativeFlyerFrontTemplate: keine Vorderseiten-Vorlagentabelle übergeben."
    );
  }

  if (gender !== "male" && gender !== "female") {
    throw new Error(
      "resolveRepresentativeFlyerFrontTemplate: Der Repräsentanten-Flyer benötigt ein Geschlecht ('male'/'female') zur Auswahl der Vorderseite."
    );
  }

  if (salutation !== "du" && salutation !== "sie") {
    throw new Error(
      "resolveRepresentativeFlyerFrontTemplate: Der Repräsentanten-Flyer benötigt eine Ansprache ('du'/'sie') zur Auswahl der Vorderseite."
    );
  }

  const bySalutation = templatesByGenderAndSalutation[gender];
  const template = bySalutation ? bySalutation[salutation] : undefined;
  if (template === undefined) {
    throw new Error(
      `resolveRepresentativeFlyerFrontTemplate: keine Vorderseiten-Vorlage für die Kombination gender="${gender}" / salutation="${salutation}".`
    );
  }
  return template;
}
