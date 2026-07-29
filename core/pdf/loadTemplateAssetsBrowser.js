/**
 * Browser-Variante von `loadTemplateAssets.js`: lädt Hintergrund-PDF
 * und Schriftdateien einer Template-Config nicht über Node `fs`,
 * sondern per `fetch()` von der jeweiligen URL (funktioniert mit den
 * `new URL("./datei", import.meta.url)`-Pfaden in den
 * Template-Configs, die Vite als statische Assets auflöst).
 *
 * Bewusst dieselbe Rückgabeform wie `loadTemplateAssets.js`, damit
 * `renderFlyer.js` (per `deps.loadTemplateAssets`) wahlweise diese
 * oder die Node-Variante verwenden kann, ohne selbst etwas über die
 * Laufzeitumgebung zu wissen.
 *
 * @param {object} templateConfig
 * @returns {Promise<{backgroundBytes: Uint8Array, fonts: Record<string, {type:"standard", name:string} | {type:"file", bytes:Uint8Array}>}>}
 */
export async function loadTemplateAssetsBrowser(templateConfig) {
  const backgroundBytes = await fetchBytes(templateConfig.background);

  const fonts = {};
  for (const [fontKey, fontConfig] of Object.entries(templateConfig.fonts)) {
    if (fontConfig.type === "file") {
      fonts[fontKey] = { type: "file", bytes: await fetchBytes(fontConfig.path) };
    } else if (fontConfig.type === "standard") {
      fonts[fontKey] = { type: "standard", name: fontConfig.name };
    } else {
      throw new Error(`loadTemplateAssetsBrowser: unbekannter Font-Typ "${fontConfig.type}" für Font "${fontKey}".`);
    }
  }

  return { backgroundBytes, fonts };
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`loadTemplateAssetsBrowser: Asset konnte nicht geladen werden (${url}, Status ${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
