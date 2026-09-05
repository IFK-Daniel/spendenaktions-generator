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
const { isUpstashConfigured, redisSetNx, redisIncrWithExpiry } = await import("./upstashRedis.js");

const CLEAR_ALL_VARS = {
  UPSTASH_REDIS_REST_URL: undefined,
  UPSTASH_REDIS_REST_TOKEN: undefined,
  KV_REST_API_URL: undefined,
  KV_REST_API_TOKEN: undefined,
};

test("isUpstashConfigured: false, wenn Env-Vars fehlen", () =>
  withEnv(CLEAR_ALL_VARS, () => {
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
  withEnv(CLEAR_ALL_VARS, async () => {
    await assert.rejects(() => redisSetNx("ifk:id:IFKABC", "1"));
  }));

test("isUpstashConfigured: true über KV_REST_API_URL/KV_REST_API_TOKEN (Vercel-Storage-Namensschema)", () =>
  withEnv(
    { ...CLEAR_ALL_VARS, KV_REST_API_URL: "https://example-kv.upstash.io", KV_REST_API_TOKEN: "kv-token" },
    () => {
      assert.equal(isUpstashConfigured(), true);
    }
  ));

test("redisSetNx: funktioniert über das KV_REST_API_*-Namensschema", () =>
  withEnv(
    { ...CLEAR_ALL_VARS, KV_REST_API_URL: "https://example-kv.upstash.io", KV_REST_API_TOKEN: "kv-token" },
    () =>
      withFetch(
        async (url, opts) => {
          assert.equal(url, "https://example-kv.upstash.io/set/ifk%3Aid%3AIFKABC/1/NX");
          assert.equal(opts.headers.Authorization, "Bearer kv-token");
          return { ok: true, json: async () => ({ result: "OK" }) };
        },
        async () => {
          const wasSet = await redisSetNx("ifk:id:IFKABC", "1");
          assert.equal(wasSet, true);
        }
      )
  ));

test("UPSTASH_REDIS_REST_*-Paar hat Vorrang, wenn beide Namensschemata gesetzt sind", () =>
  withEnv(
    {
      ...CLEAR_ALL_VARS,
      UPSTASH_REDIS_REST_URL: "https://primary.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "primary-token",
      KV_REST_API_URL: "https://secondary-kv.upstash.io",
      KV_REST_API_TOKEN: "secondary-token",
    },
    () =>
      withFetch(
        async (url, opts) => {
          assert.equal(url, "https://primary.upstash.io/set/ifk%3Aid%3AIFKABC/1/NX");
          assert.equal(opts.headers.Authorization, "Bearer primary-token");
          return { ok: true, json: async () => ({ result: "OK" }) };
        },
        () => redisSetNx("ifk:id:IFKABC", "1")
      )
  ));

test("unvollständiges Paar (nur URL ODER nur Token je Schema) gilt als nicht konfiguriert — kein Mischen der Paare", () =>
  withEnv(
    {
      ...CLEAR_ALL_VARS,
      UPSTASH_REDIS_REST_URL: "https://primary.upstash.io",
      // UPSTASH_REDIS_REST_TOKEN bewusst nicht gesetzt
      KV_REST_API_TOKEN: "secondary-token",
      // KV_REST_API_URL bewusst nicht gesetzt
    },
    () => {
      assert.equal(isUpstashConfigured(), false);
    }
  ));

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

test("redisIncrWithExpiry: erster Aufruf liefert 1 und setzt ein Ablaufdatum", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () => {
    const calledUrls = [];
    return withFetch(
      async (url) => {
        calledUrls.push(url);
        if (url.includes("/incr/")) return { ok: true, json: async () => ({ result: 1 }) };
        if (url.includes("/expire/")) return { ok: true, json: async () => ({ result: 1 }) };
        throw new Error("unerwarteter Befehl: " + url);
      },
      async () => {
        const count = await redisIncrWithExpiry("ifk:loginrate:1.2.3.4", 300);
        assert.equal(count, 1);
        assert.ok(calledUrls.some((u) => u === "https://example.upstash.io/incr/ifk%3Aloginrate%3A1.2.3.4"));
        assert.ok(calledUrls.some((u) => u === "https://example.upstash.io/expire/ifk%3Aloginrate%3A1.2.3.4/300"));
      }
    );
  }));

test("redisIncrWithExpiry: spätere Aufrufe im selben Fenster setzen die TTL nicht erneut", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () => {
    let expireCalls = 0;
    return withFetch(
      async (url) => {
        if (url.includes("/incr/")) return { ok: true, json: async () => ({ result: 4 }) };
        if (url.includes("/expire/")) {
          expireCalls += 1;
          return { ok: true, json: async () => ({ result: 1 }) };
        }
        throw new Error("unerwarteter Befehl: " + url);
      },
      async () => {
        const count = await redisIncrWithExpiry("ifk:loginrate:1.2.3.4", 300);
        assert.equal(count, 4);
        assert.equal(expireCalls, 0, "EXPIRE darf nur beim allerersten INCR (Ergebnis 1) aufgerufen werden");
      }
    );
  }));

test("redisIncrWithExpiry: liefert den Zählerstand trotzdem, wenn EXPIRE fehlschlägt (best effort)", () =>
  withEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }, () =>
    withFetch(
      async (url) => {
        if (url.includes("/incr/")) return { ok: true, json: async () => ({ result: 1 }) };
        if (url.includes("/expire/")) return { ok: false, status: 500, json: async () => ({}) };
        throw new Error("unerwarteter Befehl: " + url);
      },
      async () => {
        const count = await redisIncrWithExpiry("ifk:loginrate:1.2.3.4", 300);
        assert.equal(count, 1);
      }
    )
  ));

test("redisIncrWithExpiry: wirft, wenn nicht konfiguriert", () =>
  withEnv(CLEAR_ALL_VARS, async () => {
    await assert.rejects(() => redisIncrWithExpiry("ifk:loginrate:1.2.3.4", 300));
  }));
