import { resolveRepresentativeFlyerFrontTemplate } from "./resolveRepresentativeFlyerFrontTemplate.js";
import { buildFlyerVariantFilename, buildFlyerVariantLabel } from "./buildFlyerVariantFilename.js";
import { getFlyerSalutationVariants } from "./roleConfig.js";

/**
 * Baut aus einem/mehreren ausgewählten Flyer-Manifest-Einträgen die
 * tatsächlich zu erzeugenden Flyer-AUFTRÄGE — automatisch EINEN Auftrag
 * je konfigurierter Ansprache-Variante der Rolle (siehe
 * `core/materials/roleConfig.js`, `flyerSalutationVariants`/
 * `getFlyerSalutationVariants`). Ansprache ist bewusst KEINE
 * Nutzerauswahl: wählt der Anwender z. B. "Flyer Druckerei" für einen
 * Repräsentanten, entstehen hier automatisch die Aufträge für
 * "…Druckerei_Du.pdf" UND "…Druckerei_Sie.pdf".
 *
 * DOM-frei und unabhängig von `src/intern/generator.js` testbar — die
 * einzige Stelle, die weiß, dass es mehrere Ansprache-Varianten gibt;
 * `generator.js` iteriert nur noch über das Ergebnis und ruft
 * `generateFlyerMaterial()` je Auftrag auf.
 *
 * Kein stiller Fallback: eine Rolle mit Flyer-Vorlage, aber ohne
 * konfigurierte Ansprache-Variante(n), wirft — statt clammheimlich nur
 * einen Flyer ohne Ansprache-Kennzeichnung zu erzeugen.
 *
 * @param {object} params
 * @param {Array<{key: string, label: string, category: string, format: string, extension: string, filename: string}>} params.entries
 *   Die ausgewählten Flyer-Einträge aus `manifest.materials`
 *   (`FLYER_DRUCKEREI` und/oder `FLYER_HOME`).
 * @param {string} params.roleKey Wegbegleiter-Typ (siehe `roleConfig.js`).
 * @param {"male" | "female"} params.gender
 * @param {{ female: {du: object, sie: object}, male: {du: object, sie: object} }} params.frontTemplatesByGenderAndSalutation
 *   Siehe `resolveRepresentativeFlyerFrontTemplate`.
 * @returns {Array<{entry: object, salutation: "du"|"sie", templateConfig: object}>}
 *   Ein Eintrag je (Flyer-Manifest-Eintrag × Ansprache-Variante), in
 *   dieser Reihenfolge — `entry` trägt bereits den variantenspezifischen
 *   `filename`/`label`, sonst identisch zum Ursprungseintrag.
 * @throws {Error} Wenn für `roleKey` keine Ansprache-Variante hinterlegt
 *   ist, oder über `resolveRepresentativeFlyerFrontTemplate` bei
 *   fehlendem/ungültigem `gender`.
 */
export function buildFlyerVariantEntries({ entries, roleKey, gender, frontTemplatesByGenderAndSalutation }) {
  const variants = getFlyerSalutationVariants(roleKey);
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(
      `buildFlyerVariantEntries: für den Wegbegleiter-Typ "${roleKey}" ist keine Flyer-Ansprachevariante hinterlegt.`
    );
  }

  const jobs = [];
  for (const entry of entries ?? []) {
    for (const salutation of variants) {
      const templateConfig = resolveRepresentativeFlyerFrontTemplate(
        frontTemplatesByGenderAndSalutation,
        gender,
        salutation
      );
      jobs.push({
        entry: {
          ...entry,
          filename: buildFlyerVariantFilename(entry.filename, salutation),
          label: buildFlyerVariantLabel(entry.label, salutation),
        },
        salutation,
        templateConfig,
      });
    }
  }
  return jobs;
}
