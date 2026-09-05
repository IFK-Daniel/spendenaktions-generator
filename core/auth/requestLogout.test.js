import { test } from "node:test";
import assert from "node:assert/strict";
import { requestLogout } from "./requestLogout.js";

function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test("requestLogout ruft /api/logout mit credentials: same-origin auf", () =>
  withFetch(
    async (url, opts) => {
      assert.equal(url, "/api/logout");
      assert.equal(opts.method, "POST");
      assert.equal(opts.credentials, "same-origin");
      return { ok: true, json: async () => ({ ok: true }) };
    },
    () => requestLogout()
  ));

test("requestLogout wirft nie, auch bei Netzwerkfehler", () =>
  withFetch(
    async () => {
      throw new TypeError("Failed to fetch");
    },
    async () => {
      await assert.doesNotReject(() => requestLogout());
    }
  ));
