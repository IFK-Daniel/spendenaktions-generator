import { test } from "node:test";
import assert from "node:assert/strict";
import { requestLogin } from "./requestLogin.js";

function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("requestLogin sendet credentials: same-origin, damit das Session-Cookie akzeptiert wird", () =>
  withFetch(
    async (url, opts) => {
      assert.equal(url, "/api/login");
      assert.equal(opts.method, "POST");
      assert.equal(opts.credentials, "same-origin");
      const body = JSON.parse(opts.body);
      assert.equal(body.username, "admin");
      assert.equal(body.password, "secret");
      return jsonResponse(200, { ok: true });
    },
    async () => {
      const result = await requestLogin({ username: "admin", password: "secret" });
      assert.equal(result.ok, true);
    }
  ));

test("falsche Zugangsdaten: ok=false mit Fehlermeldung vom Server", () =>
  withFetch(
    async () => jsonResponse(401, { ok: false, error: "Benutzername oder Passwort ist falsch." }),
    async () => {
      const result = await requestLogin({ username: "admin", password: "falsch" });
      assert.equal(result.ok, false);
      assert.match(result.error, /falsch/);
    }
  ));
