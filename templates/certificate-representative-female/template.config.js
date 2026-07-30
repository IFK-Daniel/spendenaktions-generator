import { certificateRepresentativeMaleTemplate } from "../certificate-representative-male/template.config.js";

/**
 * Template-Config "Repräsentantenurkunde – weiblich".
 *
 * Nutzt bewusst dieselben Feld-/Font-/Seiten-Angaben wie
 * `certificate-representative-male` (identisches Layout, siehe dortige
 * Kommentare zur Herleitung der Namensbalken-Koordinaten) — nur
 * `background` (eigene Master-Vorlage "Urkunde Repräsentantin.pdf")
 * sowie `key`/`label` unterscheiden sich.
 *
 * Enthält damit auch dieselbe optische Y-Korrektur `fields.name.
 * verticalOffsetMm = 2.2` (siehe ausführliche Herleitung dort) — der
 * grüne Namensbalken sitzt in `background.pdf` (weiblich) an exakt
 * derselben Position wie in der männlichen Vorlage (geprüft), daher
 * gilt derselbe empirisch ermittelte Korrekturwert unverändert.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const certificateRepresentativeFemaleTemplate = Object.freeze({
  ...certificateRepresentativeMaleTemplate,
  key: "CERTIFICATE_REPRESENTATIVE_FEMALE",
  label: "Repräsentantenurkunde (weiblich)",
  background: BACKGROUND_URL,
});
