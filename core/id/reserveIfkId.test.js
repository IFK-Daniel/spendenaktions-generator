import { test } from "node:test";
import assert from "node:assert/strict";
import { reserveIfkId } from "./reserveIfkId.js";

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

test("ungültige IFK-ID wird gar nicht erst an den Server geschickt", async () => {
  let fetchCalled = false;
  await withFetch(
    async () => {
      fetchCalled = true;
      return jsonResponse(200, { ok: true, reserved: true });
    },
    async () => {
      const result = await reserveIfkId("keine-gueltige-id");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "invalid");
    }
  );
  assert.equal(fetchCalled, false);
});

test("freie ID wird reserviert (ok: true, reason: reserved)", () =>
  withFetch(
    async (url, opts) => {
      assert.equal(url, "/api/reserve-ifk-id");
      assert.equal(opts.method, "POST");
      const body = JSON.parse(opts.body);
      assert.equal(body.ifkId, "IFK7QX");
      return jsonResponse(200, { ok: true, reserved: true });
    },
    async () => {
      const result = await reserveIfkId("ifk7qx");
      assert.equal(result.ok, true);
      assert.equal(result.reason, "reserved");
    }
  ));

test("bereits vergebene ID: ok=false, reason=taken", () =>
  withFetch(
    async () => jsonResponse(200, { ok: true, reserved: false }),
    async () => {
      const result = await reserveIfkId("IFK7QX");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "taken");
      assert.match(result.error, /bereits vergeben/);
    }
  ));

test("Server meldet Fehler (z. B. Speicher nicht konfiguriert): ok=false, reason=server-error", () =>
  withFetch(
    async () => jsonResponse(503, { ok: false, error: "..." }),
    async () => {
      const result = await reserveIfkId("IFK7QX");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "server-error");
    }
  ));

test("Netzwerkfehler: ok=false, reason=unreachable, keine Ausnahme", () =>
  withFetch(
    async () => {
      throw new TypeError("Failed to fetch");
    },
    async () => {
      const result = await reserveIfkId("IFK7QX");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "unreachable");
    }
  ));

test("unlesbare Serverantwort (kein JSON): ok=false, reason=unreachable", () =>
  withFetch(
    async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    }),
    async () => {
      const result = await reserveIfkId("IFK7QX");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "unreachable");
    }
  ));
