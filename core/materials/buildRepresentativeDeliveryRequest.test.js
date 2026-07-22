import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveRepresentativeRecipient,
  buildRepresentativeDeliveryRequest,
} from "./buildRepresentativeDeliveryRequest.js";

function fakeManifest(overrides = {}) {
  return {
    person: {
      firstName: "Max",
      lastName: "Mustermann",
      ifkId: "IFK7QX",
      gender: "male",
      federalState: "Bayern",
      region: "Regensburg Land",
      email: "max@example.com",
      ...overrides,
    },
  };
}

function fakeZip() {
  return { filename: "IFK_Materialien_IFK7QX_Max_Mustermann.zip", blob: new Blob(["zip-inhalt"]) };
}

function fakeFiles() {
  return [
    { filename: "IFK_Max_Mustermann_PayPal_QR_gruen.png", content: new Blob(["grün"]) },
    { filename: "IFK_Max_Mustermann_GiroCode_schwarz.png", content: new Blob(["schwarz"]) },
  ];
}

test("resolveRepresentativeRecipient nutzt standardmäßig person.email", () => {
  const to = resolveRepresentativeRecipient({ person: { email: "max@example.com" } });
  assert.equal(to, "max@example.com");
});

test("resolveRepresentativeRecipient nutzt die abweichende Adresse, wenn angegeben", () => {
  const to = resolveRepresentativeRecipient({
    person: { email: "max@example.com" },
    alternativeEmail: "mitarbeiter@example.com",
  });
  assert.equal(to, "mitarbeiter@example.com");
});

test("resolveRepresentativeRecipient lehnt eine ungültige abweichende Adresse ab", () => {
  assert.throws(
    () =>
      resolveRepresentativeRecipient({
        person: { email: "max@example.com" },
        alternativeEmail: "keine-email",
      }),
    /ungültige abweichende E-Mail-Adresse/
  );
});

test("resolveRepresentativeRecipient wirft ohne gültige person.email und ohne Alternative", () => {
  assert.throws(
    () => resolveRepresentativeRecipient({ person: { email: undefined } }),
    /keine gültige E-Mail-Adresse/
  );
});

test("buildRepresentativeDeliveryRequest: Standardempfänger stammt aus person.email", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "max@example.com");
});

test("buildRepresentativeDeliveryRequest: abweichende Adresse überschreibt person.email", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    alternativeEmail: "mitarbeiter@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "mitarbeiter@example.com");
});

test("buildRepresentativeDeliveryRequest: ungültige abweichende Adresse wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      buildRepresentativeDeliveryRequest({
        manifest: fakeManifest(),
        zip: fakeZip(),
        files: fakeFiles(),
        alternativeEmail: "keine-email",
        logoUrl: "https://example.com/logo.png",
      }),
    /ungültige abweichende E-Mail-Adresse/
  );
});

test("Repräsentant erhält genau das ZIP-Archiv, keine Einzeldateien", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.zipFilename, "IFK_Materialien_IFK7QX_Max_Mustermann.zip");
  assert.equal(typeof request.recipient.zipContent, "string");
  assert.ok(request.recipient.zipContent.length > 0);
  assert.deepEqual(Object.keys(request.recipient).sort(), [
    "html",
    "subject",
    "text",
    "to",
    "zipContent",
    "zipFilename",
  ]);
});

test("humbee erhält die Einzeldateien und keine ZIP-Datei", async () => {
  const files = fakeFiles();
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files,
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.humbee.attachments.length, files.length);
  assert.deepEqual(
    request.humbee.attachments.map((att) => att.filename),
    files.map((file) => file.filename)
  );
  for (const attachment of request.humbee.attachments) {
    assert.equal(typeof attachment.content, "string");
    assert.ok(attachment.content.length > 0);
  }
  assert.ok(!("zipContent" in request.humbee));
  assert.ok(!("zipFilename" in request.humbee));
});

test("humbee-Empfänger und -Betreff werden aus dem Manifest gebildet", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.humbee.to, "office@its-for-kids.de");
  assert.equal(request.humbee.subject, "Repräsentant Bayern / Regensburg Land / Mustermann, Max");
});

test("gender 'female' erzeugt 'Repräsentantin' im Mailtext an den Repräsentanten", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ gender: "female", firstName: "Anna" }),
    zip: fakeZip(),
    files: fakeFiles(),
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(request.recipient.text, /Repräsentantin/);
});
