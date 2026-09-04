import { buildFlyerVariantFilename, buildFlyerVariantLabel } from "./buildFlyerVariantFilename.js";
import { getFlyerSalutationVariants, DEFAULT_FLYER_SALUTATION_VARIANTS } from "./roleConfig.js";

/**
 * Baut aus einem/mehreren ausgewählten Flyer-Manifest-Einträgen die
 * tatsächlich zu erzeugenden Flyer-AUFTRÄGE — EINEN Auftrag je
 * angeforderter Ansprache-Variante (`params.salutationVariants`).
 *
 * Ansprache ist NICHT mehr automatisch "alle Varianten der Rolle" —
 * die Entscheidung, WELCHE Varianten erzeugt werden, liegt beim
 * Aufrufer (`src/intern/generator.js`, gesteuert über die UI: Standard
 * ist nur "du", siehe `DEFAULT_FLYER_SALUTATION_VARIANTS`; das
 * Standard-Starter-Set fordert immer explizit `["du"]` an, eine
 * bewusste Zusatzauswahl "Sie-Variante zusätzlich erstellen" fordert
 * `["du", "sie"]` an). Diese Funktion selbst kennt keine UI-Zustände —
 * sie bekommt die gewünschten Varianten fertig übergeben und validiert
 * sie nur gegen die für die Rolle GRUNDSÄTZLICH verfügbaren Varianten
 * (`getFlyerSalutationVariants`), damit z. B. keine "sie"-Variante für
 * eine Rolle ohne Sie-Vorlage angefordert werden kann.
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
 * DOM-frei und unabhängig von `src/intern/generator.js` testbar.
 *
 * Kein stiller Fallback: eine Rolle mit Flyer-Vorlage, aber ohne
 * konfigurierte Ansprache-Variante(n), wirft — statt clammheimlich nur
 * einen Flyer ohne Ansprache-Kennzeichnung zu erzeugen. Ebenso wirft
 * eine angeforderte Variante, die für die Rolle nicht verfügbar ist.
 *
 * @param {object} params
 * @param {Array<{key: string, label: string, category: string, format: string, extension: string, filename: string}>} params.entries
 *   Die ausgewählten Flyer-Einträge aus `manifest.materials`
 *   (`FLYER_DRUCKEREI` und/oder `FLYER_HOME`).
 * @param {string} params.roleKey Wegbegleiter-Typ (siehe `roleConfig.js`).
 * @param {string[]} [params.salutationVariants] Die tatsächlich
 *   anzufordernden Ansprache-Varianten (z. B. `["du"]` oder
 *   `["du", "sie"]`). Ohne Angabe: `DEFAULT_FLYER_SALUTATION_VARIANTS`
 *   (`["du"]`) — der neue Standardfall "nur Du".
 * @returns {Array<{entry: object, salutation: "du"|"sie"}>}
 *   Ein Eintrag je (Flyer-Manifest-Eintrag × angeforderter Ansprache-
 *   Variante), in dieser Reihenfolge — `entry` trägt bereits den
 *   variantenspezifischen `filename`/`label`, sonst identisch zum
 *   Ursprungseintrag.
 * @throws {Error} Wenn für `roleKey` keine Ansprache-Variante hinterlegt
 *   ist, oder wenn eine angeforderte Variante für die Rolle nicht
 *   verfügbar ist.
 */
export function buildFlyerVariantEntries({ entries, roleKey, salutationVariants }) {
  const availableVariants = getFlyerSalutationVariants(roleKey);
  if (!Array.isArray(availableVariants) || availableVariants.length === 0) {
    throw new Error(
      `buildFlyerVariantEntries: für den Wegbegleiter-Typ "${roleKey}" ist keine Flyer-Ansprachevariante hinterlegt.`
    );
  }

  const requestedVariants =
    Array.isArray(salutationVariants) && salutationVariants.length > 0
      ? salutationVariants
      : DEFAULT_FLYER_SALUTATION_VARIANTS;

  for (const variant of requestedVariants) {
    if (!availableVariants.includes(variant)) {
      throw new Error(
        `buildFlyerVariantEntries: Ansprache-Variante "${variant}" ist für den Wegbegleiter-Typ "${roleKey}" nicht verfügbar (verfügbar: ${availableVariants.join(", ")}).`
      );
    }
  }

  const jobs = [];
  for (const entry of entries ?? []) {
    for (const salutation of requestedVariants) {
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
