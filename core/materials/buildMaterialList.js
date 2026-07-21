import { MATERIAL_TYPES, MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";

/**
 * Legt fest, welche Materialtypen erzeugt werden sollen.
 *
 * Ohne Optionen werden alle sechs Materialtypen in der festen,
 * reproduzierbaren Reihenfolge aus `materialTypes.js` zurückgegeben.
 *
 * @param {object} [options]
 * @param {string[]} [options.include] Nur diese Materialtyp-Schlüssel
 *   auswählen. Unbekannte Schlüssel führen zu einem Fehler.
 * @param {string[]} [options.exclude] Diese Materialtyp-Schlüssel aus
 *   der Auswahl entfernen. Unbekannte Schlüssel führen zu einem Fehler.
 * @returns {Array<{key: string, label: string, category: string, format: string, extension: string}>}
 *   Die ausgewählten Materialtyp-Objekte, in fester Reihenfolge, ohne
 *   Duplikate.
 * @throws {Error} Wenn `include`/`exclude` kein Array ist oder einen
 *   unbekannten Materialtyp-Schlüssel enthält.
 */
export function buildMaterialList(options = {}) {
  const { include, exclude } = options || {};

  assertKeyList(include, "include");
  assertKeyList(exclude, "exclude");

  const includeSet = include ? new Set(include) : null;
  const excludeSet = new Set(exclude || []);

  return MATERIAL_TYPES.filter((type) => {
    if (includeSet && !includeSet.has(type.key)) {
      return false;
    }
    return !excludeSet.has(type.key);
  });
}

function assertKeyList(keys, paramName) {
  if (keys === undefined) {
    return;
  }

  if (!Array.isArray(keys)) {
    throw new Error(`buildMaterialList: '${paramName}' muss ein Array von Materialtyp-Schlüsseln sein.`);
  }

  for (const key of keys) {
    if (!MATERIAL_TYPES_BY_KEY[key]) {
      throw new Error(`buildMaterialList: unbekannter Materialtyp "${key}" in '${paramName}'.`);
    }
  }
}
