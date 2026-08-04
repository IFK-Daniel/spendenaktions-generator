import { test } from "node:test";
import assert from "node:assert/strict";
import { sendRepresentativeMaterials } from "./sendRepresentativeMaterials.js";

function fakeRequest() {
  return {
    recipient: {
      to: "max.mustermann@example.com",
      subject: "Deine Materialien",
      text: "Hallo Max",
      html: "<p>Hallo Max</p>",
      zipFilename: "IFK_Materialien.zip",
      zipContent: Buffer.from("zip-inhalt").toString("base64"),
    },
    humbee: {
      to: "office@its-for-kids.de",
      subject: "Repräsentant NRW / Region / Mustermann, Max",
      text: "Für Max wurden Materialien erstellt.",
      attachments: [{ filename: "qr.png", content: Buffer.from("png-inhalt").toString("base64") }],
    },
  };
}

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

test("beide Teile werden als zwei getrennte Requests gesendet", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      if (body.humbee) {
        return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee@x>" } });
      }
      throw new Error("unerwarteter Request-Body: " + opts.body);
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, true);
      assert.equal(result.representative.success, true);
      assert.equal(result.humbee.success, true);
    }
  ));

test("kein Request enthält recipient UND humbee gleichzeitig", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert.ok(
        (body.recipient && !body.humbee) || (body.humbee && !body.recipient),
        "jeder Request darf nur recipient ODER humbee enthalten, nie beide (Grund: Vercel-Payload-Limit)"
      );
      return jsonResponse(200, body.recipient ? { ok: true, representative: { success: true } } : { ok: true, humbee: { success: true } });
    },
    () => sendRepresentativeMaterials(fakeRequest())
  ));

test("representative schlägt fehl, humbee erfolgreich: ok=false, Fehler nur bei representative", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: false, representative: { success: false, error: "SMTP abgelehnt." } });
      }
      return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee@x>" } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, false);
      assert.equal(result.representative.success, false);
      assert.equal(result.representative.error, "SMTP abgelehnt.");
      assert.equal(result.humbee.success, true);
    }
  ));

test("humbee schlägt fehl, representative erfolgreich: ok=false, Fehler nur bei humbee", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      return jsonResponse(200, { ok: false, humbee: { success: false, error: "humbee SMTP down." } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, false);
      assert.equal(result.representative.success, true);
      assert.equal(result.humbee.success, false);
      assert.equal(result.humbee.error, "humbee SMTP down.");
    }
  ));

test("Plattform-Fehler ohne JSON-Antwort (z. B. 413) führt zu einer verständlichen, HTTP-Status-haltigen Fehlermeldung", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      return {
        ok: false,
        status: 413,
        json: async () => {
          throw new Error("not json");
        },
      };
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, false);
      assert.equal(result.representative.success, true);
      assert.equal(result.humbee.success, false);
      assert.match(result.humbee.error, /413/);
    }
  ));

test("zu große Anhänge werden schon vor dem Request erkannt und nicht gesendet", async () => {
  const hugeBase64 = "A".repeat(4_500_000);
  const request = fakeRequest();
  request.humbee.attachments = [{ filename: "riesig.pdf", content: hugeBase64 }];

  let fetchCalled = false;
  await withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      fetchCalled = true;
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(request);
      assert.equal(result.humbee.success, false);
      assert.match(result.humbee.error, /zu groß/);
    }
  );
  assert.equal(fetchCalled, false, "bei zu großem Anhang darf gar kein Request an den Server gehen");
});

test("Netzwerkfehler beim Fetch führt zu einer eigenen Fehlermeldung statt eines Absturzes", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        throw new TypeError("Failed to fetch");
      }
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.representative.success, false);
      assert.match(result.representative.error, /nicht erreichbar/);
    }
  ));

test("humbee-Anhänge, die zusammen zu groß für einen Request sind, werden auf mehrere Mails aufgeteilt", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      // Jeder humbee-Teil-Request muss für sich unter dem Limit bleiben.
      assert.ok(opts.body.length < 4_000_000, "jeder Teil-Request muss unter dem Byte-Limit bleiben");
      return jsonResponse(200, {
        ok: true,
        humbee: { success: true, messageId: `<humbee-${body.humbee.attachments.length}@x>` },
      });
    },
    async () => {
      const request = fakeRequest();
      // Drei ~1.6 MB base64-Anhänge (~4.8 MB zusammen) sprengen einen
      // einzelnen Request, passen aber jeweils einzeln locker darunter.
      const bigAttachment = (name) => ({ filename: name, content: "A".repeat(1_600_000) });
      request.humbee.attachments = [bigAttachment("flyer-druckerei.pdf"), bigAttachment("flyer-home.pdf"), bigAttachment("urkunde.pdf")];

      const result = await sendRepresentativeMaterials(request);
      assert.equal(result.ok, true);
      assert.equal(result.humbee.success, true);
    }
  ));

test("Teilaufteilung der humbee-Mail: schlägt ein Teil fehl, gilt humbee insgesamt als fehlgeschlagen mit konkreter Fehlermeldung", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      if (body.humbee.subject.includes("Teil 1")) {
        return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee-1@x>" } });
      }
      return jsonResponse(200, { ok: false, humbee: { success: false, error: "SMTP abgelehnt (Teil 2)." } });
    },
    async () => {
      const request = fakeRequest();
      const bigAttachment = (name) => ({ filename: name, content: "A".repeat(1_600_000) });
      request.humbee.attachments = [bigAttachment("flyer-druckerei.pdf"), bigAttachment("flyer-home.pdf"), bigAttachment("urkunde.pdf")];

      const result = await sendRepresentativeMaterials(request);
      assert.equal(result.ok, false);
      assert.equal(result.humbee.success, false);
      assert.match(result.humbee.error, /SMTP abgelehnt \(Teil 2\)/);
    }
  ));

test("humbee-Anhänge, die zusammen unter dem Limit bleiben, werden weiterhin als eine einzige Mail gesendet", () =>
  withFetch(
    async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.recipient) {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      assert.ok(!body.humbee.subject.includes("Teil"), "bei kleinem Materialsatz darf keine Teil-Kennzeichnung im Betreff stehen");
      assert.equal(body.humbee.attachments.length, 1);
      return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee@x>" } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, true);
    }
  ));
