import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_SESSION_KEY, isAuthenticated, setAuthenticated, clearAuthenticated } from "./authSession.js";

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

test("isAuthenticated liefert false, wenn nichts gespeichert ist", () => {
  const storage = createFakeStorage();
  assert.equal(isAuthenticated(storage), false);
});

test("setAuthenticated setzt den Session-Schlüssel auf 'true'", () => {
  const storage = createFakeStorage();
  setAuthenticated(storage);
  assert.equal(storage.getItem(AUTH_SESSION_KEY), "true");
  assert.equal(isAuthenticated(storage), true);
});

test("clearAuthenticated entfernt den Session-Schlüssel wieder", () => {
  const storage = createFakeStorage();
  setAuthenticated(storage);
  clearAuthenticated(storage);
  assert.equal(isAuthenticated(storage), false);
  assert.equal(storage.getItem(AUTH_SESSION_KEY), null);
});

test("isAuthenticated ignoriert fremde Werte im Speicher", () => {
  const storage = createFakeStorage();
  storage.setItem(AUTH_SESSION_KEY, "yes");
  assert.equal(isAuthenticated(storage), false);
});
