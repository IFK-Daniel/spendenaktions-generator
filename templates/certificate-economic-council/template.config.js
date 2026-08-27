import { certificateAdvisoryBoardTemplate } from "../certificate-advisory-board/template.config.js";

/**
 * Template-Config "Urkunde Wirtschaftsrat".
 *
 * Gleiches Layout wie `certificate-advisory-board` (identische
 * Namensbalken-Geometrie, geprüft) — nur `background` (eigene
 * Master-Vorlage `Medien/Urkunde_Wirtschaftsrat.pdf` mit dem statischen
 * Text "… in den Wirtschaftsrat der Stiftung") sowie `key`/`label`
 * unterscheiden sich. Ebenfalls geschlechtsneutral: genau eine Vorlage.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const certificateEconomicCouncilTemplate = Object.freeze({
  ...certificateAdvisoryBoardTemplate,
  key: "CERTIFICATE_ECONOMIC_COUNCIL",
  label: "Urkunde Wirtschaftsrat",
  background: BACKGROUND_URL,
});
