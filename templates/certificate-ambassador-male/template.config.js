import { certificateAdvisoryBoardTemplate } from "../certificate-advisory-board/template.config.js";

/**
 * Template-Config "Botschafterurkunde – männlich".
 *
 * Gleiches Layout wie `certificate-advisory-board` (identische
 * Namensbalken-Geometrie, geprüft) — nur `background` (eigene
 * Master-Vorlage `Medien/Urkunde_Botschafter.pdf`) sowie `key`/`label`
 * unterscheiden sich.
 *
 * ANDERS als die Gremien-Urkunden ist diese Vorlage
 * GESCHLECHTSSPEZIFISCH: der statische Text lautet "Hiermit ernennen wir
 * … zum Botschafter der Stiftung" (weibliche Variante:
 * `certificate-ambassador-female`, "… zur Botschafterin der Stiftung").
 * Die Auswahl male/female erfolgt vor dem Rendern in
 * `src/intern/generator.js` (`resolveCertificateTemplate`); Geschlecht
 * ist für diese Urkunde daher Pflicht
 * (`core/materials/materialRequirements.js`).
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const certificateAmbassadorMaleTemplate = Object.freeze({
  ...certificateAdvisoryBoardTemplate,
  key: "CERTIFICATE_AMBASSADOR_MALE",
  label: "Botschafterurkunde (männlich)",
  background: BACKGROUND_URL,
});
