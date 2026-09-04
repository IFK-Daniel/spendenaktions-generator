import { test } from "node:test";
import assert from "node:assert/strict";
import { generateAndReserveIfkId } from "./generateAndReserveIfkId.js";
import { validateIfkId } from "./validateIfkId.js";

function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test("erster Kandidat frei: liefert eine gültige, reservierte ID nach genau einem Request", () =>
  withFetch(
    async () => jsonResponse(200, { ok: true, reserved: true }),
    async () => {
      const result = await generateAndReserveIfkId();
      assert.equal(result.ok, true);
      assert.equal(validateIfkId(result.ifkId).valid, true);
    }
  ));

test("Kollision beim ersten Versuch führt zu einem neuen Kandidaten (Generator versucht erneut)", () =>
  withFetch(
    (() => {
      let calls = 0;
      return async () => {
        calls += 1;
        return jsonResponse(200, { ok: true, reserved: calls > 1 });
      };
    })(),
    async () => {
      const result = await generateAndReserveIfkId();
      assert.equal(result.ok, true);
    }
  ));

test("dauerhafte Kollision (Speicher immer 'bereits vergeben'): kein Ergebnis nach Erschöpfen der Versuche", () =>
  withFetch(
    async () => jsonResponse(200, { ok: true, reserved: false }),
    async () => {
      const result = await generateAndReserveIfkId();
      assert.equal(result.ok, false);
      assert.match(result.error, /später erneut/);
    }
  ));

test("Speicherfehler bricht sofort ab, ohne weitere Versuche und ohne ID", async () => {
  let calls = 0;
  await withFetch(
    async () => {
      calls += 1;
      return jsonResponse(503, { ok: false, error: "down" });
    },
    async () => {
      const result = await generateAndReserveIfkId();
      assert.equal(result.ok, false);
      assert.equal("ifkId" in result, false);
    }
  );
  assert.equal(calls, 1, "bei einem echten Speicherfehler darf kein zweiter Versuch erfolgen");
});

test("Netzwerkfehler liefert ok=false statt einer Ausnahme", () =>
  withFetch(
    async () => {
      throw new TypeError("Failed to fetch");
    },
    async () => {
      const result = await generateAndReserveIfkId();
      assert.equal(result.ok, false);
    }
  ));
