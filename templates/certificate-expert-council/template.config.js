import { certificateAdvisoryBoardTemplate } from "../certificate-advisory-board/template.config.js";

/**
 * Template-Config "Urkunde Fachrat".
 *
 * Gleiches Layout wie `certificate-advisory-board` (identische
 * Namensbalken-Geometrie, geprüft) — nur `background` (eigene
 * Master-Vorlage `Medien/Urkunde_Fachrat.pdf` mit dem statischen Text
 * "… in den Fachrat der Stiftung") sowie `key`/`label` unterscheiden
 * sich. Ebenfalls geschlechtsneutral: genau eine Vorlage.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const certificateExpertCouncilTemplate = Object.freeze({
  ...certificateAdvisoryBoardTemplate,
  key: "CERTIFICATE_EXPERT_COUNCIL",
  label: "Urkunde Fachrat",
  background: BACKGROUND_URL,
});
