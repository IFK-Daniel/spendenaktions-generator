import { certificateAmbassadorMaleTemplate } from "../certificate-ambassador-male/template.config.js";

/**
 * Template-Config "Botschafterurkunde – weiblich".
 *
 * Nutzt bewusst dieselben Feld-/Font-/Seiten-Angaben wie
 * `certificate-ambassador-male` (identisches Layout, geprüft) — nur
 * `background` (eigene Master-Vorlage `Medien/Urkunde_Botschafterin.pdf`
 * mit dem statischen Text "… zur Botschafterin der Stiftung") sowie
 * `key`/`label` unterscheiden sich.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const certificateAmbassadorFemaleTemplate = Object.freeze({
  ...certificateAmbassadorMaleTemplate,
  key: "CERTIFICATE_AMBASSADOR_FEMALE",
  label: "Botschafterurkunde (weiblich)",
  background: BACKGROUND_URL,
});
