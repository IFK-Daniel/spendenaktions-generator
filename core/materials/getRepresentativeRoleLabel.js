import { GENDER_VALUES } from "./buildMaterialManifest.js";

/**
 * Liefert die deutsche Rollenbezeichnung für die Repräsentanten-Mail
 * anhand von `person.gender`. Reine Textzuordnung, keine
 * Seiteneffekte.
 *
 * @param {"male" | "female" | undefined} gender
 * @returns {"Repräsentant" | "Repräsentantin"}
 *   `"female"` ergibt "Repräsentantin", jeder andere Wert (inkl.
 *   `"male"` und fehlender Angabe) ergibt "Repräsentant".
 */
export function getRepresentativeRoleLabel(gender) {
  return gender === GENDER_VALUES.FEMALE ? "Repräsentantin" : "Repräsentant";
}
