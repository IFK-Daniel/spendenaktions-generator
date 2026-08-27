import { certificateAdvisoryBoardTemplate } from "../certificate-advisory-board/template.config.js";

/**
 * Template-Config "Urkunde Kuratorium".
 *
 * Gleiches Layout wie `certificate-advisory-board` (identische
 * Namensbalken-Geometrie, geprüft) — nur `background` (eigene
 * Master-Vorlage `Medien/Urkunde_Kuratorium.pdf` mit dem statischen Text
 * "… ins Kuratorium der Stiftung") sowie `key`/`label` unterscheiden
 * sich. Ebenfalls geschlechtsneutral: genau eine Vorlage.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const certificateCuratoriumTemplate = Object.freeze({
  ...certificateAdvisoryBoardTemplate,
  key: "CERTIFICATE_CURATORIUM",
  label: "Urkunde Kuratorium",
  background: BACKGROUND_URL,
});
