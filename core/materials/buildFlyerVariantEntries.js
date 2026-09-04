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
 * Löst bewusst NUR die Ansprache-Variante auf — NICHT die passende
 * Vorderseiten-Template-Config: Druckerei (mit Beschnitt) und Home
 * (ohne Beschnitt, imponiert) brauchen unterschiedliche Template-
 * Tabellen für denselben `entry.key`/dieselbe Ansprache (siehe
 * `src/intern/generator.js`, `resolveFlyerFrontTemplateForJob`) — die
 * Auswahl DER Vorlagen-Tabelle bleibt daher beim Aufrufer, diese
 * Funktion kennt nur "welche Ansprachen" und "wie heißt die Datei je
 * Ansprache".
 *
 * DOM-frei und unabhängig von `src/intern/generator.js` testbar — die
 * einzige Stelle, die weiß, dass es mehrere Ansprache-Varianten gibt.
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
 * @returns {Array<{entry: object, salutation: "du"|"sie"}>}
 *   Ein Eintrag je (Flyer-Manifest-Eintrag × Ansprache-Variante), in
 *   dieser Reihenfolge — `entry` trägt bereits den variantenspezifischen
 *   `filename`/`label`, sonst identisch zum Ursprungseintrag.
 * @throws {Error} Wenn für `roleKey` keine Ansprache-Variante hinterlegt ist.
 */
export function buildFlyerVariantEntries({ entries, roleKey }) {
  const variants = getFlyerSalutationVariants(roleKey);
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(
      `buildFlyerVariantEntries: für den Wegbegleiter-Typ "${roleKey}" ist keine Flyer-Ansprachevariante hinterlegt.`
    );
  }

  const jobs = [];
  for (const entry of entries ?? []) {
    for (const salutation of variants) {
      jobs.push({
        entry: {
          ...entry,
          filename: buildFlyerVariantFilename(entry.filename, salutation),
          label: buildFlyerVariantLabel(entry.label, salutation),
        },
        salutation,
      });
    }
  }
  return jobs;
}
