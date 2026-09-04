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

function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

// Modul-Import NACH dem Setzen der Env-Vars in jedem Test, da
// `upstashRedis.js` `process.env` bei jedem Aufruf frisch liest
// (keine Top-Level-Konstanten) — ein einmaliger Import zu Testbeginn
// reicht hier also aus.
const { isUpstashConfigured, redisSetNx } = await import("./upstashRedis.js");

test("isUpstashConfigured: false, wenn Env-Vars fehlen", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined }, () => {
    assert.equal(isUpstashConfigured(), false);
  }));

test("isUpstashConfigured: true, wenn beide Env-Vars gesetzt sind", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () => {
    assert.equal(isUpstashConfigured(), true);
  }));

test("redisSetNx: freier Key liefert true (Upstash-Antwort { result: 'OK' })", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () =>
    withFetch(
      async (url, opts) => {
        assert.equal(url, "https://example.upstash.io/set/ifk%3Aid%3AIFKABC/1/NX");
        assert.equal(opts.headers.Authorization, "Bearer token");
        return { ok: true, json: async () => ({ result: "OK" }) };
      },
      async () => {
        const wasSet = await redisSetNx("ifk:id:IFKABC", "1");
        assert.equal(wasSet, true);
      }
    )
  ));

test("redisSetNx: bereits vorhandener Key liefert false (Upstash-Antwort { result: null })", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () =>
    withFetch(
      async () => ({ ok: true, json: async () => ({ result: null }) }),
      async () => {
        const wasSet = await redisSetNx("ifk:id:IFKABC", "1");
        assert.equal(wasSet, false);
      }
    )
  ));

test("redisSetNx: wirft, wenn nicht konfiguriert", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined }, async () => {
    await assert.rejects(() => redisSetNx("ifk:id:IFKABC", "1"));
  }));

test("redisSetNx: wirft bei Netzwerkfehler", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () =>
    withFetch(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      async () => {
        await assert.rejects(() => redisSetNx("ifk:id:IFKABC", "1"));
      }
    )
  ));

test("redisSetNx: wirft bei Nicht-OK-HTTP-Status", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () =>
    withFetch(
      async () => ({ ok: false, status: 500, json: async () => ({}) }),
      async () => {
        await assert.rejects(() => redisSetNx("ifk:id:IFKABC", "1"));
      }
    )
  ));

test("parallele Reservierungsversuche auf denselben Key: exakt einer gewinnt (atomare NX-Simulation)", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () => {
    // Simuliert den serverseitigen Upstash-Zustand mit einem einzigen,
    // synchron geprüften In-Memory-Set — genau das ist es, was Redis'
    // eigene Atomarität für `SET ... NX` garantiert (keine zwei
    // gleichzeitigen Requests sehen denselben Key als "frei").
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
        const results = await Promise.all([
          redisSetNx("ifk:id:IFKABC", "1"),
          redisSetNx("ifk:id:IFKABC", "1"),
          redisSetNx("ifk:id:IFKABC", "1"),
        ]);
        const winners = results.filter(Boolean);
        assert.equal(winners.length, 1, "genau ein paralleler Versuch darf gewinnen");
      }
    );
  }));
