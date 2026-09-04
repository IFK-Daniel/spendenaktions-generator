import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./reserve-ifk-id.js";

function withEnv(vars, fn) {
  const originals = {};
  for (const key of Object.keys(vars)) {
    originals[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(originals)) {
        if (originals[key] === undefined) delete process.env[key];
        else process.env[key] = originals[key];
      }
    });
}

function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function fakeReqRes({ method = "POST", body = {} } = {}) {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req: { method, body }, res };
}

const CONFIGURED_ENV = { UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" };

test("nicht-POST wird abgelehnt (405)", async () => {
  const { req, res } = fakeReqRes({ method: "GET" });
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});

test("ungültige IFK-ID: 400, kein Redis-Zugriff", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new Error("darf nicht aufgerufen werden");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "keine-gueltige-id" } });
        await handler(req, res);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.ok, false);
      }
    )
  ));

test("freie ID: 200, reserved=true", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => ({ ok: true, json: async () => ({ result: "OK" }) }),
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "ifk7qx" } });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.ok, true);
        assert.equal(res.body.reserved, true);
      }
    )
  ));

test("bereits vergebene ID: 200, reserved=false (kein Fehler)", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => ({ ok: true, json: async () => ({ result: null }) }),
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" } });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.ok, true);
        assert.equal(res.body.reserved, false);
      }
    )
  ));

test("Speicher nicht konfiguriert: 503, keine ungeprüfte ID/kein technischer Fehlertext im UI", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined }, async () => {
    const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" } });
    await handler(req, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.ok, false);
    assert.doesNotMatch(res.body.error, /Upstash|Redis|HTTP|Error/i);
  }));

test("Speicherfehler (Netzwerk) beim Reservieren: 503, keine ungeprüfte ID", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" } });
        await handler(req, res);
        assert.equal(res.statusCode, 503);
        assert.equal(res.body.ok, false);
        assert.doesNotMatch(res.body.error, /Upstash|Redis|HTTP|Error/i);
      }
    )
  ));
