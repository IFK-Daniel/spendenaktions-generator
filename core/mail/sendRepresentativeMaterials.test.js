import { test } from "node:test";
import assert from "node:assert/strict";
import { sendRepresentativeMaterials } from "./sendRepresentativeMaterials.js";

function fakeRequest() {
  return {
    recipientMailParts: [
      {
        kind: "materials",
        to: "max.mustermann@example.com",
        subject: "Deine Materialien",
        text: "Hallo Max",
        html: "<p>Hallo Max</p>",
        attachmentFilename: "IFK_Materialien.zip",
        attachmentBlob: new Blob(["zip-inhalt"]),
      },
    ],
    humbeeMailParts: [
      {
        kind: "materials",
        to: "office@its-for-kids.de",
        subject: "Repräsentant NRW / Region / Mustermann, Max – Materialversand",
        text: "Für Max wurden Materialien erstellt.",
        attachments: [{ filename: "qr.png", content: new Blob(["png-inhalt"]) }],
      },
    ],
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

async function readMetadata(formData) {
  return JSON.parse(formData.get("metadata"));
}

function findByKind(results, kind) {
  return results.find((result) => result.kind === kind);
}

test("beide Teile werden als zwei getrennte multipart/form-data-Requests gesendet", () =>
  withFetch(
    async (url, opts) => {
      assert.ok(opts.body instanceof FormData, "Request-Body muss FormData sein, kein JSON.stringify(...)");
      assert.ok(!("headers" in opts) || !opts.headers?.["Content-Type"], "Content-Type darf nicht manuell gesetzt sein (Boundary käme sonst vom Browser nicht korrekt mit)");
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      if (metadata.kind === "humbee") {
        return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee@x>" } });
      }
      throw new Error("unerwartete metadata.kind: " + metadata.kind);
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, true);
      assert.equal(findByKind(result.recipientResults, "materials").success, true);
      assert.equal(findByKind(result.humbeeResults, "materials").success, true);
    }
  ));

test("FormData enthält kein Base64 — Dateien sind rohe Binärteile mit erhaltenem Namen", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        const zipEntry = opts.body.get("files");
        assert.ok(zipEntry instanceof Blob, "Datei-Teil muss ein Blob/File sein");
        assert.equal(zipEntry.name, "IFK_Materialien.zip");
        const text = await zipEntry.text();
        assert.equal(text, "zip-inhalt", "Inhalt darf nicht Base64-kodiert sein");
        return jsonResponse(200, { ok: true, representative: { success: true } });
      }
      const files = opts.body.getAll("files");
      assert.equal(files.length, 1);
      assert.equal(files[0].name, "qr.png");
      assert.equal(await files[0].text(), "png-inhalt");
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    () => sendRepresentativeMaterials(fakeRequest())
  ));

test("recipient-Metadata enthält alle Mailfelder, aber keine Dateiinhalte", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        assert.equal(metadata.to, "max.mustermann@example.com");
        assert.equal(metadata.subject, "Deine Materialien");
        assert.equal(metadata.text, "Hallo Max");
        assert.equal(metadata.html, "<p>Hallo Max</p>");
        assert.equal(metadata.zipFilename, "IFK_Materialien.zip");
        assert.equal("zipContent" in metadata, false, "metadata darf keine Base64-Dateiinhalte mehr enthalten");
        return jsonResponse(200, { ok: true, representative: { success: true } });
      }
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    () => sendRepresentativeMaterials(fakeRequest())
  ));

test("kein Request enthält recipient- UND humbee-Metadata gleichzeitig", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      assert.ok(
        metadata.kind === "recipient" || metadata.kind === "humbee",
        "jeder Request darf nur eine Art Metadata enthalten, nie beide (Grund: Vercel-Payload-Limit)"
      );
      return jsonResponse(200, metadata.kind === "recipient" ? { ok: true, representative: { success: true } } : { ok: true, humbee: { success: true } });
    },
    () => sendRepresentativeMaterials(fakeRequest())
  ));

test("Empfänger-Mail schlägt fehl, humbee erfolgreich: ok=false, Fehler nur beim Empfänger-Teil", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: false, representative: { success: false, error: "SMTP abgelehnt." } });
      }
      return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee@x>" } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, false);
      const recipient = findByKind(result.recipientResults, "materials");
      assert.equal(recipient.success, false);
      assert.equal(recipient.error, "SMTP abgelehnt.");
      assert.equal(findByKind(result.humbeeResults, "materials").success, true);
    }
  ));

test("humbee schlägt fehl, Empfänger-Mail erfolgreich: ok=false, Fehler nur bei humbee", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      return jsonResponse(200, { ok: false, humbee: { success: false, error: "humbee SMTP down." } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, false);
      assert.equal(findByKind(result.recipientResults, "materials").success, true);
      const humbee = findByKind(result.humbeeResults, "materials");
      assert.equal(humbee.success, false);
      assert.equal(humbee.error, "humbee SMTP down.");
    }
  ));

test("Plattform-Fehler ohne JSON-Antwort (z. B. 413) führt zu einer verständlichen, HTTP-Status-haltigen Fehlermeldung", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
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
      assert.equal(findByKind(result.recipientResults, "materials").success, true);
      const humbee = findByKind(result.humbeeResults, "materials");
      assert.equal(humbee.success, false);
      assert.match(humbee.error, /413/);
    }
  ));

test("zu große Anhänge werden schon vor dem Request erkannt (anhand der echten Multipart-Größe) und nicht gesendet", async () => {
  const request = fakeRequest();
  request.humbeeMailParts[0].attachments = [{ filename: "riesig.pdf", content: new Blob([new Uint8Array(4_500_000)]) }];

  let fetchCalled = false;
  await withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      fetchCalled = true;
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(request);
      const humbee = findByKind(result.humbeeResults, "materials");
      assert.equal(humbee.success, false);
      assert.match(humbee.error, /zu groß/);
    }
  );
  assert.equal(fetchCalled, false, "bei zu großem Anhang darf gar kein Request an den Server gehen");
});

test("Netzwerkfehler beim Fetch führt zu einer eigenen Fehlermeldung statt eines Absturzes", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        throw new TypeError("Failed to fetch");
      }
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      const recipient = findByKind(result.recipientResults, "materials");
      assert.equal(recipient.success, false);
      assert.match(recipient.error, /nicht erreichbar/);
    }
  ));

test("humbee-Anhänge, die zusammen zu groß für einen Request sind, werden auf mehrere Mails aufgeteilt", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      // Jeder humbee-Teil-Request muss für sich unter dem Limit bleiben —
      // jetzt anhand der tatsächlichen (unkodierten) Multipart-Bytezahl.
      const bytes = Buffer.from(await new Response(opts.body).arrayBuffer()).length;
      assert.ok(bytes < 4_450_000, "jeder Teil-Request muss unter dem Byte-Limit bleiben");
      return jsonResponse(200, {
        ok: true,
        humbee: { success: true, messageId: `<humbee-${opts.body.getAll("files").length}@x>` },
      });
    },
    async () => {
      const request = fakeRequest();
      // Drei ~1,6 MB-Anhänge (~4,8 MB zusammen, unkodiert) sprengen einen
      // einzelnen Request, passen aber jeweils einzeln locker darunter —
      // ohne Base64-Aufblähung ist das jetzt sogar deutlich mehr Reserve
      // als in der alten Base64/JSON-Architektur.
      const bigAttachment = (name) => ({ filename: name, content: new Blob([new Uint8Array(1_600_000)]) });
      request.humbeeMailParts[0].attachments = [bigAttachment("flyer-druckerei.pdf"), bigAttachment("flyer-home.pdf"), bigAttachment("urkunde.pdf")];

      const result = await sendRepresentativeMaterials(request);
      assert.equal(result.ok, true);
      assert.equal(findByKind(result.humbeeResults, "materials").success, true);
    }
  ));

test("Teilaufteilung der humbee-Mail: schlägt ein Teil fehl, gilt humbee insgesamt als fehlgeschlagen mit konkreter Fehlermeldung", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      if (metadata.subject.includes("Teil 1")) {
        return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee-1@x>" } });
      }
      return jsonResponse(200, { ok: false, humbee: { success: false, error: "SMTP abgelehnt (Teil 2)." } });
    },
    async () => {
      const request = fakeRequest();
      const bigAttachment = (name) => ({ filename: name, content: new Blob([new Uint8Array(1_600_000)]) });
      request.humbeeMailParts[0].attachments = [bigAttachment("flyer-druckerei.pdf"), bigAttachment("flyer-home.pdf"), bigAttachment("urkunde.pdf")];

      const result = await sendRepresentativeMaterials(request);
      assert.equal(result.ok, false);
      const humbee = findByKind(result.humbeeResults, "materials");
      assert.equal(humbee.success, false);
      assert.match(humbee.error, /SMTP abgelehnt \(Teil 2\)/);
    }
  ));

test("humbee-Anhänge, die zusammen unter dem Limit bleiben, werden weiterhin als eine einzige Mail gesendet", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: "<rep@x>" } });
      }
      assert.ok(!metadata.subject.includes("Teil"), "bei kleinem Materialsatz darf keine Teil-Kennzeichnung im Betreff stehen");
      assert.equal(opts.body.getAll("files").length, 1);
      return jsonResponse(200, { ok: true, humbee: { success: true, messageId: "<humbee@x>" } });
    },
    async () => {
      const result = await sendRepresentativeMaterials(fakeRequest());
      assert.equal(result.ok, true);
    }
  ));

test("Anleitung bleibt exklusiv beim Empfänger — humbee-Attachments sind unabhängig davon, was im ZIP steckt", () =>
  withFetch(
    async (url, opts) => {
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        // Der Empfänger bekommt genau EIN Datei-Teil: das ZIP (das die
        // Anleitung serverseitig bereits enthält, siehe generator.js).
        assert.equal(opts.body.getAll("files").length, 1);
        return jsonResponse(200, { ok: true, representative: { success: true } });
      }
      // humbee erhält ausschließlich die in humbeeMailParts[0].attachments
      // übergebenen Dateien — keine automatisch hinzugefügte Anleitung.
      const names = opts.body.getAll("files").map((f) => f.name);
      assert.deepEqual(names, ["qr.png"]);
      return jsonResponse(200, { ok: true, humbee: { success: true } });
    },
    () => sendRepresentativeMaterials(fakeRequest())
  ));

test("Repräsentant mit Materialien + Urkunde: vier unabhängige Requests (2 Empfänger, 2 humbee), jeder für sich vermessen", async () => {
  const request = {
    recipientMailParts: [
      { kind: "materials", to: "max@example.com", subject: "Materialien", text: "t", html: "<p>t</p>", attachmentFilename: "IFK_Materialien.zip", attachmentBlob: new Blob(["zip"]) },
      { kind: "certificate", to: "max@example.com", subject: "Deine Urkunde als Repräsentant von It's for Kids", text: "t", html: "<p>t</p>", attachmentFilename: "IFK_Urkunde.pdf", attachmentBlob: new Blob(["pdf"]) },
    ],
    humbeeMailParts: [
      { kind: "materials", to: "office@its-for-kids.de", subject: "Repräsentant / Mustermann, Max – Materialversand", text: "t", attachments: [{ filename: "qr.png", content: new Blob(["png"]) }] },
      { kind: "certificate", to: "office@its-for-kids.de", subject: "Repräsentant / Mustermann, Max – Urkundenversand", text: "t", attachments: [{ filename: "IFK_Urkunde.pdf", content: new Blob(["pdf"]) }] },
    ],
  };

  let requestCount = 0;
  const result = await withFetch(
    async (url, opts) => {
      requestCount += 1;
      const metadata = await readMetadata(opts.body);
      if (metadata.kind === "recipient") {
        return jsonResponse(200, { ok: true, representative: { success: true, messageId: `<${metadata.subject}@x>` } });
      }
      return jsonResponse(200, { ok: true, humbee: { success: true, messageId: `<${metadata.subject}@x>` } });
    },
    () => sendRepresentativeMaterials(request)
  );

  assert.equal(requestCount, 4);
  assert.equal(result.ok, true);
  assert.equal(result.recipientResults.length, 2);
  assert.equal(result.humbeeResults.length, 2);
  assert.equal(findByKind(result.recipientResults, "certificate").success, true);
  assert.equal(findByKind(result.humbeeResults, "certificate").success, true);
});
