import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./login.js";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "./_lib/sessionAuth.js";

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

function fakeReqRes({ method = "POST", body = {}, ip = "203.0.113.7" } = {}) {
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
  return { req: { method, body, headers: { "x-forwarded-for": ip }, socket: { remoteAddress: ip } }, res };
}

const FULL_ENV = {
  MATERIAL_ADMIN_USERNAME: "admin",
  MATERIAL_ADMIN_PASSWORD: "secret",
  SESSION_SECRET: "test-secret-do-not-use-in-prod",
};

test("nicht-POST wird abgelehnt (405)", async () => {
  const { req, res } = fakeReqRes({ method: "GET" });
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});

test("korrekte Zugangsdaten: 200, ok=true, gültiges Session-Cookie gesetzt", () =>
  withEnv(FULL_ENV, async () => {
    const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);

    const setCookie = res.headers["Set-Cookie"];
    assert.ok(setCookie, "Set-Cookie muss gesetzt sein");
    assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);

    const token = setCookie.split(";")[0].split("=")[1];
    assert.equal(isValidSessionToken(token), true);
  }));

test("falsches Passwort: 401, kein Set-Cookie", () =>
  withEnv(FULL_ENV, async () => {
    const { req, res } = fakeReqRes({ body: { username: "admin", password: "falsch" } });
    await handler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.equal("Set-Cookie" in res.headers, false);
  }));

test("fehlende Zugangsdaten: 401, kein Set-Cookie", () =>
  withEnv(FULL_ENV, async () => {
    const { req, res } = fakeReqRes({ body: {} });
    await handler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal("Set-Cookie" in res.headers, false);
  }));

test("MATERIAL_ADMIN_* nicht konfiguriert: 500, kein Set-Cookie", () =>
  withEnv({ MATERIAL_ADMIN_USERNAME: undefined, MATERIAL_ADMIN_PASSWORD: undefined, SESSION_SECRET: "x" }, async () => {
    const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
    await handler(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal("Set-Cookie" in res.headers, false);
  }));

test("SESSION_SECRET nicht konfiguriert (aber Zugangsdaten korrekt): 500, kein Set-Cookie — kein Login ohne Session-Fähigkeit", () =>
  withEnv({ MATERIAL_ADMIN_USERNAME: "admin", MATERIAL_ADMIN_PASSWORD: "secret", SESSION_SECRET: undefined }, async () => {
    const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
    await handler(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal("Set-Cookie" in res.headers, false);
  }));

const REDIS_ENV = { UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" };

test("Rate-Limit: nach Überschreiten der erlaubten Versuche wird auch ein korrekter Login mit 429 blockiert", () =>
  withEnv({ ...FULL_ENV, ...REDIS_ENV }, () =>
    withFetch(
      async (url) => {
        if (url.includes("/incr/")) return { ok: true, json: async () => ({ result: 11 }) }; // > 10
        if (url.includes("/expire/")) return { ok: true, json: async () => ({ result: 1 }) };
        throw new Error("unerwarteter Redis-Aufruf: " + url);
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
        await handler(req, res);
        assert.equal(res.statusCode, 429);
        assert.equal(res.body.ok, false);
        assert.equal("Set-Cookie" in res.headers, false);
      }
    )
  ));

test("Rate-Limit: unter dem Limit funktioniert der Login normal", () =>
  withEnv({ ...FULL_ENV, ...REDIS_ENV }, () =>
    withFetch(
      async (url) => {
        if (url.includes("/incr/")) return { ok: true, json: async () => ({ result: 3 }) }; // unter 10
        if (url.includes("/expire/")) return { ok: true, json: async () => ({ result: 1 }) };
        throw new Error("unerwarteter Redis-Aufruf: " + url);
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.ok, true);
      }
    )
  ));

test("Rate-Limit: Redis-Fehler blockiert den Login NICHT (fail open, Auth bleibt die eigentliche Grenze)", () =>
  withEnv({ ...FULL_ENV, ...REDIS_ENV }, () =>
    withFetch(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.ok, true);
      }
    )
  ));

test("Rate-Limit: ohne konfigurierten Redis-Speicher wird gar nicht erst gezählt (kein Fetch-Aufruf, Login funktioniert)", () => {
  let fetchCalled = false;
  return withEnv(FULL_ENV, () =>
    withFetch(
      async () => {
        fetchCalled = true;
        return { ok: true, json: async () => ({ result: 1 }) };
      },
      async () => {
        const { req, res } = fakeReqRes({ body: { username: "admin", password: "secret" } });
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(fetchCalled, false, "ohne konfigurierten Redis-Speicher darf kein Rate-Limit-Request erfolgen");
      }
    )
  );
});
