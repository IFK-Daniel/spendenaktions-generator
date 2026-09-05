import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./reserve-ifk-id.js";
import { SESSION_COOKIE_NAME, createSessionToken } from "./_lib/sessionAuth.js";

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

function fakeReqRes({ method = "POST", body = {}, cookie } = {}) {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
  return { req: { method, body, headers: cookie !== undefined ? { cookie } : {} }, res };
}

const REDIS_ENV = { UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" };
const SESSION_ENV = { SESSION_SECRET: "test-secret-do-not-use-in-prod" };
const CONFIGURED_ENV = { ...REDIS_ENV, ...SESSION_ENV };

// Baut ein für die Tests gültiges Session-Cookie mit der echten
// Signierlogik aus `sessionAuth.js` — testet damit die tatsächliche
// Integration statt einer eigenen Nachbildung.
function validCookie() {
  return `${SESSION_COOKIE_NAME}=${createSessionToken()}`;
}

test("nicht-POST wird abgelehnt (405)", async () => {
  const { req, res } = fakeReqRes({ method: "GET" });
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});

test("ohne Session-Cookie: 401, keine Redis-Operation", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new Error("darf nicht aufgerufen werden — keine Redis-Operation ohne gültige Session");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" } });
        await handler(req, res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.ok, false);
      }
    )
  ));

test("mit ungültigem/manipuliertem Session-Cookie: 401, keine Redis-Operation", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new Error("darf nicht aufgerufen werden");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" }, cookie: `${SESSION_COOKIE_NAME}=faelschung.ungueltig` });
        await handler(req, res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.ok, false);
      }
    )
  ));

test("mit abgelaufenem Session-Cookie: 401, keine Redis-Operation", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new Error("darf nicht aufgerufen werden");
      },
      async () => {
        const expiredToken = createSessionToken(-1000);
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" }, cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` });
        await handler(req, res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.ok, false);
      }
    )
  ));

test("ungültige IFK-ID mit gültiger Session: 400, kein Redis-Zugriff", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new Error("darf nicht aufgerufen werden");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "keine-gueltige-id" }, cookie: validCookie() });
        await handler(req, res);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.ok, false);
      }
    )
  ));

test("freie ID mit gültiger Session: 200, reserved=true", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => ({ ok: true, json: async () => ({ result: "OK" }) }),
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "ifk7qx" }, cookie: validCookie() });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.ok, true);
        assert.equal(res.body.reserved, true);
      }
    )
  ));

test("bereits vergebene ID mit gültiger Session: 200, reserved=false (kein Fehler)", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => ({ ok: true, json: async () => ({ result: null }) }),
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" }, cookie: validCookie() });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.ok, true);
        assert.equal(res.body.reserved, false);
      }
    )
  ));

test("zwei parallele Requests mit gültiger Session auf dieselbe freie ID: exakt einer gewinnt", () =>
  withEnv(CONFIGURED_ENV, () => {
    const remoteState = new Set();
    return withFetch(
      async (url) => {
        const key = decodeURIComponent(url.split("/set/")[1].split("/")[0]);
        if (remoteState.has(key)) {
          return { ok: true, json: async () => ({ result: null }) };
        }
        remoteState.add(key);
        return { ok: true, json: async () => ({ result: "OK" }) };
      },
      async () => {
        const cookie = validCookie();
        const results = await Promise.all(
          [1, 2].map(async () => {
            const { req, res } = fakeReqRes({ body: { ifkId: "IFKPRL" }, cookie });
            await handler(req, res);
            return res.body;
          })
        );
        const winners = results.filter((r) => r.ok === true && r.reserved === true);
        assert.equal(winners.length, 1, "genau ein paralleler Request darf gewinnen");
      }
    );
  }));

test("Speicher nicht konfiguriert (aber gültige Session): 503, keine ungeprüfte ID/kein technischer Fehlertext im UI", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined, ...SESSION_ENV }, async () => {
    const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" }, cookie: validCookie() });
    await handler(req, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.ok, false);
    assert.doesNotMatch(res.body.error, /Upstash|Redis|HTTP|Error/i);
  }));

test("Speicherfehler (Netzwerk) mit gültiger Session: 503, keine ungeprüfte ID", () =>
  withEnv(CONFIGURED_ENV, () =>
    withFetch(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" }, cookie: validCookie() });
        await handler(req, res);
        assert.equal(res.statusCode, 503);
        assert.equal(res.body.ok, false);
        assert.doesNotMatch(res.body.error, /Upstash|Redis|HTTP|Error/i);
      }
    )
  ));

test("SESSION_SECRET nicht konfiguriert: gültiges Cookie kann gar nicht erst existieren — Request ohne Cookie wird trotzdem 401, nicht 200", () =>
  withEnv({ ...REDIS_ENV, SESSION_SECRET: undefined }, () =>
    withFetch(
      async () => {
        throw new Error("darf nicht aufgerufen werden");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { ifkId: "IFK7QX" } });
        await handler(req, res);
        assert.equal(res.statusCode, 401);
      }
    )
  ));
