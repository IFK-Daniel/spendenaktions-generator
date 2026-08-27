/**
 * Wählt aus den Vorlagen-Varianten einer Urkunde die passende aus —
 * rein datengetrieben, ohne Kenntnis konkreter Template-Configs oder
 * PDF-Dateien (die eigentlichen Configs liegen in `templates/` und
 * werden in `src/intern/generator.js` zugeordnet).
 *
 * `variantsByGender` ist entweder
 * - `{ neutral: T }` — genau eine geschlechtsneutrale Vorlage
 *   (Beirat/Kuratorium/Fachrat/Wirtschaftsrat), oder
 * - `{ male: T, female: T }` — zwei geschlechtsspezifische Vorlagen
 *   (Repräsentant, Botschafter).
 *
 * Kein stiller Fallback: eine unbekannte Rolle (kein Eintrag) wirft,
 * ebenso eine geschlechtsspezifische Urkunde ohne `gender`. `female`
 * liefert IMMER die weibliche Variante — es gibt keinen Codepfad, der
 * bei `female` versehentlich die männliche Vorlage zurückgibt.
 *
 * @template T
 * @param {{ neutral?: T, male?: T, female?: T } | undefined} variantsByGender
 * @param {"male" | "female" | undefined} gender
 * @returns {T}
 * @throws {Error} Bei fehlendem `variantsByGender` oder fehlendem
 *   `gender` bei einer geschlechtsspezifischen Urkunde.
 */
export function resolveCertificateTemplateVariant(variantsByGender, gender) {
  if (!variantsByGender || typeof variantsByGender !== "object") {
    throw new Error(
      "resolveCertificateTemplateVariant: keine Urkunden-Vorlage für diesen Wegbegleiter-Typ hinterlegt."
    );
  }

  if (variantsByGender.neutral !== undefined) {
    return variantsByGender.neutral;
  }

  if (gender !== "male" && gender !== "female") {
    throw new Error(
      "resolveCertificateTemplateVariant: Diese Urkunde enthält geschlechtsspezifischen Text — 'gender' ('male'/'female') ist erforderlich."
    );
  }

  const variant = variantsByGender[gender];
  if (variant === undefined) {
    throw new Error(`resolveCertificateTemplateVariant: keine Vorlagen-Variante für gender "${gender}".`);
  }
  return variant;
}
