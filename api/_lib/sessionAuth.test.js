import { test } from "node:test";
import assert from "node:assert/strict";

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

// `sessionAuth.js` liest `process.env.SESSION_SECRET` bei jedem Aufruf
// frisch (keine Top-Level-Konstante) — ein einmaliger Import reicht.
const {
  SESSION_COOKIE_NAME,
  isSessionAuthConfigured,
  createSessionToken,
  isValidSessionToken,
  readCookie,
  hasValidSession,
  buildSessionCookie,
  buildClearSessionCookie,
} = await import("./sessionAuth.js");

const SECRET_ENV = { SESSION_SECRET: "test-secret-do-not-use-in-prod" };

test("isSessionAuthConfigured: false ohne SESSION_SECRET", () =>
  withEnv({ SESSION_SECRET: undefined }, () => {
    assert.equal(isSessionAuthConfigured(), false);
  }));

test("isSessionAuthConfigured: true mit SESSION_SECRET", () =>
  withEnv(SECRET_ENV, () => {
    assert.equal(isSessionAuthConfigured(), true);
  }));

test("createSessionToken wirft ohne SESSION_SECRET", () =>
  withEnv({ SESSION_SECRET: undefined }, () => {
    assert.throws(() => createSessionToken());
  }));

test("ein frisch erzeugtes Token ist gültig", () =>
  withEnv(SECRET_ENV, () => {
    const token = createSessionToken();
    assert.equal(isValidSessionToken(token), true);
  }));

test("ein manipuliertes Token (falsche Signatur) ist ungültig", () =>
  withEnv(SECRET_ENV, () => {
    const token = createSessionToken();
    const [payload] = token.split(".");
    const tampered = `${payload}.deadbeef00000000000000000000000000000000000000000000000000000`;
    assert.equal(isValidSessionToken(tampered), false);
  }));

test("ein Token mit manipulierter Payload (verlängertes Ablaufdatum) ist ungültig", () =>
  withEnv(SECRET_ENV, () => {
    const token = createSessionToken();
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ exp: Date.now() + 999_999_999_999 }), "utf8").toString("base64url");
    assert.equal(isValidSessionToken(`${forgedPayload}.${signature}`), false);
  }));

test("ein abgelaufenes, aber korrekt signiertes Token ist ungültig", () =>
  withEnv(SECRET_ENV, () => {
    // Negative TTL → korrekt signiertes Token mit exp in der
    // Vergangenheit (siehe `createSessionToken`-Dokumentation).
    const expiredToken = createSessionToken(-1000);
    assert.equal(isValidSessionToken(expiredToken), false);
  }));

test("hasValidSession: false mit abgelaufenem, aber korrekt signiertem Cookie (Session-Ablauf)", () =>
  withEnv(SECRET_ENV, () => {
    const expiredToken = createSessionToken(-1000);
    const req = { headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` } };
    assert.equal(hasValidSession(req), false);
  }));

test("readCookie liest den passenden Wert aus einem Cookie-Header mit mehreren Cookies", () => {
  const header = "a=1; ifk_intern_session=abc.def; other=xyz";
  assert.equal(readCookie(header, SESSION_COOKIE_NAME), "abc.def");
});

test("readCookie liefert undefined, wenn der Cookie-Name fehlt", () => {
  assert.equal(readCookie("a=1; b=2", SESSION_COOKIE_NAME), undefined);
  assert.equal(readCookie(undefined, SESSION_COOKIE_NAME), undefined);
  assert.equal(readCookie("", SESSION_COOKIE_NAME), undefined);
});

test("hasValidSession: true mit gültigem Cookie im Request", () =>
  withEnv(SECRET_ENV, () => {
    const token = createSessionToken();
    const req = { headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } };
    assert.equal(hasValidSession(req), true);
  }));

test("hasValidSession: false ohne Cookie-Header", () =>
  withEnv(SECRET_ENV, () => {
    assert.equal(hasValidSession({ headers: {} }), false);
    assert.equal(hasValidSession({ headers: undefined }), false);
  }));

test("hasValidSession: false mit fremdem/manipuliertem Cookie-Wert", () =>
  withEnv(SECRET_ENV, () => {
    const req = { headers: { cookie: `${SESSION_COOKIE_NAME}=irgendwas.ungueltiges` } };
    assert.equal(hasValidSession(req), false);
  }));

test("buildSessionCookie enthält HttpOnly, Secure, SameSite=Strict, Path=/api und Max-Age", () =>
  withEnv(SECRET_ENV, () => {
    const cookie = buildSessionCookie();
    assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\/api/);
    assert.match(cookie, /Max-Age=\d+/);
  }));

test("das Token aus buildSessionCookie ist gültig", () =>
  withEnv(SECRET_ENV, () => {
    const cookie = buildSessionCookie();
    const token = cookie.split(";")[0].split("=")[1];
    assert.equal(isValidSessionToken(token), true);
  }));

test("buildClearSessionCookie setzt Max-Age=0 (löscht das Cookie)", () => {
  const cookie = buildClearSessionCookie();
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=;`));
});

test("isValidSessionToken: robust gegen offensichtlich falsche Eingaben", () =>
  withEnv(SECRET_ENV, () => {
    assert.equal(isValidSessionToken(undefined), false);
    assert.equal(isValidSessionToken(null), false);
    assert.equal(isValidSessionToken(""), false);
    assert.equal(isValidSessionToken("keinpunkt"), false);
    assert.equal(isValidSessionToken("."), false);
    assert.equal(isValidSessionToken("nur-payload."), false);
  }));
