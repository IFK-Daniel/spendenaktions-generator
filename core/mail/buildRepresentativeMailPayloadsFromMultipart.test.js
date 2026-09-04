import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRepresentativeMailPayloadsFromMultipart } from "./buildRepresentativeMailPayloadsFromMultipart.js";

function zipFile(content = "zip-inhalt") {
  return { filename: "IFK_Materialien.zip", mimeType: "application/zip", content: Buffer.from(content) };
}

test("recipient: baut recipientPayload mit zipContent als Buffer aus dem einzigen Dateiteil", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: {
      kind: "recipient",
      to: "max@example.com",
      subject: "Deine Materialien",
      text: "Hallo Max",
      html: "<p>Hallo Max</p>",
      zipFilename: "IFK_Materialien.zip",
    },
    files: [zipFile()],
  });

  assert.equal(result.ok, true);
  assert.equal(result.recipientPayload.to, "max@example.com");
  assert.equal(result.recipientPayload.subject, "Deine Materialien");
  assert.equal(result.recipientPayload.zipFilename, "IFK_Materialien.zip");
  assert.ok(Buffer.isBuffer(result.recipientPayload.zipContent));
  assert.equal(result.recipientPayload.zipContent.toString("utf8"), "zip-inhalt");
});

test("recipient: lehnt eine ungültige E-Mail-Adresse ab", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "recipient", to: "keine-email", zipFilename: "a.zip" },
    files: [zipFile()],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /Empfänger-E-Mail/);
});

test("recipient: lehnt fehlenden ZIP-Dateinamen ab", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "recipient", to: "max@example.com" },
    files: [zipFile()],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /ZIP-Dateiname/);
});

test("recipient: lehnt ab, wenn kein Dateiteil vorhanden ist", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "recipient", to: "max@example.com", zipFilename: "a.zip" },
    files: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /ZIP-Anhang/);
});

test("recipient: lehnt ab, wenn mehr als eine Datei mitgeschickt wurde (mehrdeutig)", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "recipient", to: "max@example.com", zipFilename: "a.zip" },
    files: [zipFile(), zipFile()],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /ZIP-Anhang/);
});

test("humbee: baut humbeePayload mit allen Dateien als attachments (content als Buffer)", () => {
  const files = [
    { filename: "flyer-du.pdf", mimeType: "application/pdf", content: Buffer.from("du") },
    { filename: "flyer-sie.pdf", mimeType: "application/pdf", content: Buffer.from("sie") },
    { filename: "urkunde.pdf", mimeType: "application/pdf", content: Buffer.from("urkunde") },
  ];
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "humbee", to: "office@its-for-kids.de", subject: "Repräsentant …", text: "Text" },
    files,
  });

  assert.equal(result.ok, true);
  assert.equal(result.humbeePayload.to, "office@its-for-kids.de");
  assert.equal(result.humbeePayload.attachments.length, 3);
  assert.deepEqual(
    result.humbeePayload.attachments.map((a) => a.filename),
    ["flyer-du.pdf", "flyer-sie.pdf", "urkunde.pdf"]
  );
  for (const att of result.humbeePayload.attachments) {
    assert.ok(Buffer.isBuffer(att.content));
  }
});

test("humbee: Anleitung (Guide) ist NICHT automatisch enthalten — nur was tatsächlich mitgeschickt wurde", () => {
  const files = [{ filename: "qr.png", mimeType: "image/png", content: Buffer.from("qr") }];
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "humbee", to: "office@its-for-kids.de" },
    files,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.humbeePayload.attachments.map((a) => a.filename),
    ["qr.png"]
  );
  assert.ok(!result.humbeePayload.attachments.some((a) => /Hinweise|Anleitung/i.test(a.filename)));
});

test("humbee: lehnt eine ungültige E-Mail-Adresse ab", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "humbee", to: "ungueltig" },
    files: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /humbee-E-Mail/);
});

test("unbekannte oder fehlende metadata.kind wird abgelehnt", () => {
  assert.equal(buildRepresentativeMailPayloadsFromMultipart({ metadata: {}, files: [] }).ok, false);
  assert.equal(buildRepresentativeMailPayloadsFromMultipart({ metadata: { kind: "sonstwas" }, files: [] }).ok, false);
  assert.equal(buildRepresentativeMailPayloadsFromMultipart({ metadata: null, files: [] }).ok, false);
});

test("keine 'undefined'/'null'-Regression: fehlende optionale Felder bleiben einfach undefined, kein String 'undefined'", () => {
  const result = buildRepresentativeMailPayloadsFromMultipart({
    metadata: { kind: "recipient", to: "max@example.com", zipFilename: "a.zip" },
    files: [zipFile()],
  });
  assert.equal(result.ok, true);
  assert.equal(result.recipientPayload.subject, undefined);
  assert.equal(result.recipientPayload.text, undefined);
  assert.equal(result.recipientPayload.html, undefined);
});
