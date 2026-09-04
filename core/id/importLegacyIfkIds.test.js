import { test } from "node:test";
import assert from "node:assert/strict";
import { importLegacyIfkIds } from "./importLegacyIfkIds.js";

function fakeStore(initial = []) {
  const store = new Set(initial);
  return {
    store,
    reserve: async (id) => {
      if (store.has(id)) return false;
      store.add(id);
      return true;
    },
  };
}

test("alle gültigen, eindeutigen IDs werden importiert", async () => {
  const { reserve, store } = fakeStore();
  const report = await importLegacyIfkIds(["IFKABC", "IFK7QX", "IFKLJP"], reserve);

  assert.equal(report.totalLines, 3);
  assert.equal(report.validCount, 3);
  assert.equal(report.invalidCount, 0);
  assert.equal(report.uniqueCount, 3);
  assert.equal(report.duplicateCount, 0);
  assert.equal(report.importedCount, 3);
  assert.equal(report.alreadyPresentCount, 0);
  assert.deepEqual([...store].sort(), ["IFK7QX", "IFKABC", "IFKLJP"]);
});

test("Dubletten innerhalb der Importdatei werden ignoriert (nur einmal importiert)", async () => {
  const { reserve, store } = fakeStore();
  const report = await importLegacyIfkIds(["IFKABC", "ifkabc", "IFKABC"], reserve);

  assert.equal(report.uniqueCount, 1);
  assert.equal(report.duplicateCount, 2);
  assert.equal(report.importedCount, 1);
  assert.equal(store.size, 1);
});

test("bereits vorhandene IDs werden nicht überschrieben und als 'bereits vorhanden' gezählt", async () => {
  const { reserve } = fakeStore(["IFKABC"]);
  const report = await importLegacyIfkIds(["IFKABC", "IFK7QX"], reserve);

  assert.equal(report.importedCount, 1);
  assert.equal(report.alreadyPresentCount, 1);
  assert.deepEqual(report.alreadyPresentIds, ["IFKABC"]);
  assert.deepEqual(report.importedIds, ["IFK7QX"]);
});

test("ungültige Werte werden gezählt und benannt, nicht importiert", async () => {
  const { reserve, store } = fakeStore();
  const report = await importLegacyIfkIds(["IFKABC", "keine-ifk-id", "IFK1", "", "   "], reserve);

  assert.equal(report.totalLines, 3);
  assert.equal(report.validCount, 1);
  assert.equal(report.invalidCount, 2);
  assert.equal(report.invalidEntries.length, 2);
  assert.equal(report.invalidEntries[0].raw, "keine-ifk-id");
  assert.equal(report.importedCount, 1);
  assert.equal(store.size, 1);
});

test("Import ist idempotent: zweiter Lauf mit derselben Eingabe importiert nichts neu", async () => {
  const { reserve, store } = fakeStore();
  const input = ["IFKABC", "IFK7QX"];

  const first = await importLegacyIfkIds(input, reserve);
  assert.equal(first.importedCount, 2);

  const second = await importLegacyIfkIds(input, reserve);
  assert.equal(second.importedCount, 0);
  assert.equal(second.alreadyPresentCount, 2);
  assert.equal(store.size, 2);
});

test("leere Eingabe liefert einen leeren, aber gültigen Report", async () => {
  const { reserve } = fakeStore();
  const report = await importLegacyIfkIds([], reserve);

  assert.equal(report.totalLines, 0);
  assert.equal(report.validCount, 0);
  assert.equal(report.importedCount, 0);
});
