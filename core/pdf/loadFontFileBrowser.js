/**
 * Browser-Variante von `loadFontFile.js`: lädt eine einzelne
 * Schriftdatei per `fetch()` statt über Node `fs`.
 *
 * @param {URL} url
 * @returns {Promise<Uint8Array>}
 */
export async function loadFontFileBrowser(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`loadFontFileBrowser: Schriftdatei konnte nicht geladen werden (${url}, Status ${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
