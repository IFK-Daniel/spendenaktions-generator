import { ROLE_KEYS, getRoleLabel } from "./roleConfig.js";

/**
 * Liefert die deutsche Rollenbezeichnung für die Repräsentanten-Mail
 * anhand von `person.gender`. Reine Textzuordnung, keine
 * Seiteneffekte. Delegiert an die zentrale, für alle Wegbegleiter-Typen
 * gültige Rollen-Konfiguration (`core/materials/roleConfig.js`), damit
 * die Bezeichnung nur an einer Stelle gepflegt wird.
 *
 * @param {"male" | "female" | undefined} gender
 * @returns {"Repräsentant" | "Repräsentantin"}
 *   `"female"` ergibt "Repräsentantin", jeder andere Wert (inkl.
 *   `"male"` und fehlender Angabe) ergibt "Repräsentant".
 */
export function getRepresentativeRoleLabel(gender) {
  return getRoleLabel(ROLE_KEYS.REPRESENTATIVE, gender);
}
