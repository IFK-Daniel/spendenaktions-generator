import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./logout.js";
import { SESSION_COOKIE_NAME } from "./_lib/sessionAuth.js";

function fakeReqRes({ method = "POST", cookie } = {}) {
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
  return { req: { method, headers: cookie !== undefined ? { cookie } : {} }, res };
}

test("nicht-POST wird abgelehnt (405)", async () => {
  const { req, res } = fakeReqRes({ method: "GET" });
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});

test("Logout: 200, Set-Cookie löscht das Session-Cookie (Max-Age=0)", async () => {
  const { req, res } = fakeReqRes({ cookie: `${SESSION_COOKIE_NAME}=irgendein.token` });
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  const setCookie = res.headers["Set-Cookie"];
  assert.ok(setCookie);
  assert.match(setCookie, /Max-Age=0/);
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=;`));
});

test("Logout funktioniert auch ohne vorhandenes Cookie (idempotent, kein Fehler)", async () => {
  const { req, res } = fakeReqRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});
