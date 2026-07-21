/**
 * Verwaltung des einfachen "angemeldet"-Zustands für den internen
 * Materialgenerator. Kennt ausschließlich einen booleschen Zustand
 * (angemeldet/nicht angemeldet) — keine Nutzer- oder Rollenverwaltung,
 * kein Token, kein Ablaufdatum.
 *
 * DOM-/Browser-frei: `storage` (z. B. `window.sessionStorage`) wird von
 * der aufrufenden App übergeben, damit dieses Modul unter Node.js
 * testbar bleibt und keine Kenntnis von `window` benötigt.
 */

export const AUTH_SESSION_KEY = "ifk_intern_authenticated";

/**
 * @param {{ getItem(key: string): string | null }} storage
 * @returns {boolean}
 */
export function isAuthenticated(storage) {
  return storage.getItem(AUTH_SESSION_KEY) === "true";
}

/**
 * @param {{ setItem(key: string, value: string): void }} storage
 */
export function setAuthenticated(storage) {
  storage.setItem(AUTH_SESSION_KEY, "true");
}

/**
 * @param {{ removeItem(key: string): void }} storage
 */
export function clearAuthenticated(storage) {
  storage.removeItem(AUTH_SESSION_KEY);
}
