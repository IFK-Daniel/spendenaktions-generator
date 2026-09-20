import { buildCompanionFlyerFrontTemplate } from "../_shared/companionFlyerFrontBase.js";
import { REPRESENTATIVE_FLYER_PRINT_PAGE } from "../_shared/representativeFlyerPrintBase.js";

/**
 * Flyer-Vorderseiten der Wegbegleiter-Rollen (Botschafter, Beirat,
 * Fachrat, Kuratorium, Wirtschaftsrat) — je Rolle Geschlecht × Ansprache,
 * in Home-Fassung (`home/`, 148×210mm) und Druckerei-Fassung (`print/`,
 * 150×212mm mit 1mm Beschnitt, erzeugt per
 * `scripts/build-flyer-print-bleed-backgrounds.mjs`). Koordinaten:
 * `templates/_shared/companionFlyerFrontBase.js`. Die Master stammen aus
 * `Medien/` (Botschafter: `Flyer_Botschafter_*`/`Flyer_BotschafterIn_*`,
 * Gremien: `Flyer_Mitglied des …_Männer|Frauen_Du|Sie.pdf`).
 *
 * Aufbau je Ausgabeart: `{ [roleKey]: { female: { du, sie }, male: { du, sie } } }`
 * — dieselbe Form, die `resolveRepresentativeFlyerFrontTemplate`
 * erwartet. Der Repräsentant hat seine eigene Tabelle (anderer Master,
 * Regionszeile) und ist hier bewusst NICHT enthalten.
 */

const ROLE_KEYS = ["ambassador", "advisory_board", "expert_council", "curator", "economic_council"];
const ROLE_LABELS = {
  ambassador: "Botschafter",
  advisory_board: "Beirat",
  expert_council: "Fachrat",
  curator: "Kuratorium",
  economic_council: "Wirtschaftsrat",
};

function buildTable(variant) {
  const table = {};
  for (const role of ROLE_KEYS) {
    table[role] = {};
    for (const gender of ["female", "male"]) {
      table[role][gender] = {};
      for (const salutation of ["du", "sie"]) {
        const name = `${role}_${gender}_${salutation}`;
        const keyBase = `${role}_${gender}_${salutation}`.toUpperCase();
        table[role][gender][salutation] = buildCompanionFlyerFrontTemplate({
          key: `FLYER_${variant === "print" ? "PRINT" : "FRONT"}_${keyBase}`,
          label: `${ROLE_LABELS[role]}-Flyer ${variant === "print" ? "Druckerei-" : ""}Vorderseite (${gender === "female" ? "weiblich" : "männlich"}, ${salutation === "du" ? "Du" : "Sie"})`,
          background: new URL(`./${variant}/${name}.pdf`, import.meta.url),
          page: variant === "print" ? REPRESENTATIVE_FLYER_PRINT_PAGE : undefined,
        });
      }
      Object.freeze(table[role][gender]);
    }
    Object.freeze(table[role]);
  }
  return Object.freeze(table);
}

export const COMPANION_FLYER_FRONT_TEMPLATES_HOME = buildTable("home");
export const COMPANION_FLYER_FRONT_TEMPLATES_PRINT = buildTable("print");
