import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCompanionRecipient,
  resolveRepresentativeRecipient,
  RECIPIENT_ERROR_CODES,
  buildRepresentativeDeliveryRequest,
} from "./buildRepresentativeDeliveryRequest.js";

// Das Manifest trägt bewusst KEINE E-Mail mehr (sie ist nur für den —
// aktuell global deaktivierten — Flyer relevant). Der direkte Versand
// bezieht die Adresse ausschließlich aus dem aktuellen Formularwert,
// der als `companionEmail` übergeben wird.
function fakeManifest(overrides = {}) {
  return {
    person: {
      firstName: "Max",
      lastName: "Mustermann",
      ifkId: "IFK7QX",
      gender: "male",
      role: "representative",
      federalState: "Bayern",
      region: "Regensburg Land",
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

// ---------------------------------------------------------------------------
// resolveCompanionRecipient — zentrale, rollenunabhängige Empfängerauflösung
// ---------------------------------------------------------------------------

test("resolveCompanionRecipient nutzt standardmäßig den aktuellen companionEmail-Wert", () => {
  const to = resolveCompanionRecipient({ companionEmail: "n.mehwitz@its-for-kids.de" });
  assert.equal(to, "n.mehwitz@its-for-kids.de");
});

test("resolveCompanionRecipient trimmt den Formularwert", () => {
  const to = resolveCompanionRecipient({ companionEmail: "  max@example.com  " });
  assert.equal(to, "max@example.com");
});

test("resolveCompanionRecipient nutzt die abweichende Adresse, wenn angegeben", () => {
  const to = resolveCompanionRecipient({
    companionEmail: "max@example.com",
    alternativeEmail: "mitarbeiter@example.com",
  });
  assert.equal(to, "mitarbeiter@example.com");
});

test("resolveCompanionRecipient: abweichende Adresse gewinnt auch ohne companionEmail", () => {
  const to = resolveCompanionRecipient({ alternativeEmail: "mitarbeiter@example.com" });
  assert.equal(to, "mitarbeiter@example.com");
});

test("resolveCompanionRecipient: leere abweichende Adresse fällt auf den Wegbegleiter zurück", () => {
  const to = resolveCompanionRecipient({ companionEmail: "max@example.com", alternativeEmail: "   " });
  assert.equal(to, "max@example.com");
});

test("resolveCompanionRecipient lehnt eine ungültige abweichende Adresse ab (mit code)", () => {
  try {
    resolveCompanionRecipient({ companionEmail: "max@example.com", alternativeEmail: "keine-email" });
    assert.fail("hätte werfen müssen");
  } catch (err) {
    assert.equal(err.code, RECIPIENT_ERROR_CODES.ALTERNATIVE_EMAIL_INVALID);
    assert.match(err.message, /abweichende E-Mail-Adresse/);
  }
});

test("resolveCompanionRecipient wirft ohne gültige companionEmail und ohne Alternative (mit code)", () => {
  try {
    resolveCompanionRecipient({ companionEmail: "" });
    assert.fail("hätte werfen müssen");
  } catch (err) {
    assert.equal(err.code, RECIPIENT_ERROR_CODES.COMPANION_EMAIL_INVALID);
  }
});

test("resolveCompanionRecipient wirft bei ungültiger companionEmail", () => {
  try {
    resolveCompanionRecipient({ companionEmail: "kein-at-zeichen" });
    assert.fail("hätte werfen müssen");
  } catch (err) {
    assert.equal(err.code, RECIPIENT_ERROR_CODES.COMPANION_EMAIL_INVALID);
  }
});

test("resolveCompanionRecipient wirft bei komplett fehlenden Angaben", () => {
  assert.throws(() => resolveCompanionRecipient(), (err) => err.code === RECIPIENT_ERROR_CODES.COMPANION_EMAIL_INVALID);
});

// A–D: rollenunabhängig — dieselbe Auflösung für jeden Wegbegleiter-Typ.
for (const role of [
  "representative",
  "ambassador",
  "curator",
  "advisory_board",
  "expert_council",
  "economic_council",
]) {
  test(`resolveCompanionRecipient ist rollenunabhängig (${role})`, () => {
    const to = resolveCompanionRecipient({ companionEmail: `${role}@its-for-kids.de` });
    assert.equal(to, `${role}@its-for-kids.de`);
  });
}

// Rückwärtskompatibler Adapter.
test("resolveRepresentativeRecipient (deprecated) delegiert an person.email", () => {
  assert.equal(
    resolveRepresentativeRecipient({ person: { email: "legacy@example.com" } }),
    "legacy@example.com"
  );
});

// ---------------------------------------------------------------------------
// buildRepresentativeDeliveryRequest — bezieht die Adresse aus companionEmail
// ---------------------------------------------------------------------------

test("buildRepresentativeDeliveryRequest: Standardempfänger stammt aus companionEmail", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "max@example.com");
});

test("E: nachträglich geänderter Formularwert gewinnt (kein Snapshot)", async () => {
  // Manifest wurde mit alt@example.de erzeugt, Formular steht jetzt auf neu@example.de.
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ email: "alt@example.de" }),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "neu@example.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "neu@example.de");
});

test("F: screenshot-importierte Adresse im Formular wird verwendet", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "ocr.import@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "ocr.import@its-for-kids.de");
});

test("G: abweichende Adresse überschreibt den Wegbegleiter-Wert", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    alternativeEmail: "mitarbeiter@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "mitarbeiter@example.com");
});

test("H: ungültige abweichende Adresse wirft mit code ALTERNATIVE_EMAIL_INVALID", async () => {
  await assert.rejects(
    () =>
      buildRepresentativeDeliveryRequest({
        manifest: fakeManifest(),
        zip: fakeZip(),
        files: fakeFiles(),
        companionEmail: "max@example.com",
        alternativeEmail: "keine-email",
        logoUrl: "https://example.com/logo.png",
      }),
    (err) => err.code === RECIPIENT_ERROR_CODES.ALTERNATIVE_EMAIL_INVALID
  );
});

test("I: leere Wegbegleiter-Adresse wirft mit code COMPANION_EMAIL_INVALID", async () => {
  await assert.rejects(
    () =>
      buildRepresentativeDeliveryRequest({
        manifest: fakeManifest(),
        zip: fakeZip(),
        files: fakeFiles(),
        companionEmail: "   ",
        logoUrl: "https://example.com/logo.png",
      }),
    (err) => err.code === RECIPIENT_ERROR_CODES.COMPANION_EMAIL_INVALID
  );
});

test("buildRepresentativeDeliveryRequest: fällt ohne companionEmail auf manifest.person.email zurück", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ email: "fallback@example.com" }),
    zip: fakeZip(),
    files: fakeFiles(),
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "fallback@example.com");
});

test("Repräsentant erhält genau das ZIP-Archiv als rohen Blob (kein Base64), keine Einzeldateien", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.zipFilename, "IFK_Materialien_IFK7QX_Max_Mustermann.zip");
  assert.ok(request.recipient.zipBlob instanceof Blob);
  assert.ok(request.recipient.zipBlob.size > 0);
  assert.deepEqual(Object.keys(request.recipient).sort(), [
    "html",
    "subject",
    "text",
    "to",
    "zipBlob",
    "zipFilename",
  ]);
});

test("humbee erhält die Einzeldateien als rohe Blobs (kein Base64) und keine ZIP-Datei", async () => {
  const files = fakeFiles();
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files,
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.humbee.attachments.length, files.length);
  assert.deepEqual(
    request.humbee.attachments.map((att) => att.filename),
    files.map((file) => file.filename)
  );
  for (const attachment of request.humbee.attachments) {
    assert.ok(attachment.content instanceof Blob);
    assert.ok(attachment.content.size > 0);
  }
  assert.ok(!("zipBlob" in request.humbee));
  assert.ok(!("zipFilename" in request.humbee));
});

test("Repräsentanten-Flyer erzeugt automatisch beide Ansprachevarianten — humbee erhält BEIDE Dateien vollständig, keine geht verloren", async () => {
  // Simuliert das Ergebnis von `buildFlyerVariantEntries` +
  // `generateFlyerMaterial` in `src/intern/generator.js`: zwei Flyer-
  // Dateien mit demselben Materialschlüssel/derselben Kategorie, aber
  // unterschiedlichem, ansprachespezifischem Dateinamen/Label.
  const flyerFiles = [
    { key: "FLYER_HOME", label: "Flyer Home – Du", filename: "IFK_Max_Mustermann_Flyer_Home_Du.pdf", content: new Blob(["du"]) },
    { key: "FLYER_HOME", label: "Flyer Home – Sie", filename: "IFK_Max_Mustermann_Flyer_Home_Sie.pdf", content: new Blob(["sie"]) },
  ];
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: flyerFiles,
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.humbee.attachments.length, 2);
  assert.deepEqual(
    request.humbee.attachments.map((att) => att.filename),
    ["IFK_Max_Mustermann_Flyer_Home_Du.pdf", "IFK_Max_Mustermann_Flyer_Home_Sie.pdf"]
  );
});

test("humbee-Empfänger und -Betreff werden aus dem Manifest gebildet", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.humbee.to, "office@its-for-kids.de");
  assert.equal(request.humbee.subject, "Repräsentant Bayern / Regensburg Land / Mustermann, Max");
});

test("gender 'female' erzeugt 'Repräsentantin' im Mailtext an den Wegbegleiter", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ gender: "female", firstName: "Anna" }),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "anna@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(request.recipient.text, /Repräsentantin/);
});

test("B: Botschafter — direkter Versand löst die Formularadresse auf", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: {
      person: {
        firstName: "Anna",
        lastName: "Muster",
        ifkId: "IFK7QX",
        role: "ambassador",
        gender: "female",
      },
    },
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "anna.botschafter@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "anna.botschafter@its-for-kids.de");
  assert.match(request.recipient.text, /Botschafterin/);
});

test("C: Kurator — direkter Versand löst die Formularadresse auf, ohne Region", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: {
      person: {
        firstName: "Daniel",
        lastName: "Feigenbutz",
        ifkId: "IFK7QX",
        role: "curator",
        gender: "male",
      },
    },
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "kurator@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "kurator@its-for-kids.de");
  assert.match(request.recipient.text, /Einsatz als Kurator von It's for Kids/);
  assert.doesNotMatch(request.recipient.text, /Repräsentant/);
  assert.equal(request.humbee.subject, "Kurator / Feigenbutz, Daniel");
});

test("D: Beirat/Fachrat/Wirtschaftsrat — rollenunabhängige Empfängerauflösung", async () => {
  for (const role of ["advisory_board", "expert_council", "economic_council"]) {
    const request = await buildRepresentativeDeliveryRequest({
      manifest: {
        person: { firstName: "Kim", lastName: "Muster", ifkId: "IFK7QX", role },
      },
      zip: fakeZip(),
      files: fakeFiles(),
      companionEmail: `${role}@its-for-kids.de`,
      logoUrl: "https://example.com/logo.png",
    });
    assert.equal(request.recipient.to, `${role}@its-for-kids.de`);
  }
});

// ---------------------------------------------------------------------------
// IFK-ID: gehört zur Person, empfängerunabhängig, nie "undefined"
// ---------------------------------------------------------------------------

function companionManifest() {
  // Manifest OHNE ifkId/email — genau die Prod-Konstellation (nur Urkunde
  // erzeugt, kein IFK-ID-/E-Mail-pflichtiges Material).
  return { person: { firstName: "Nadine", lastName: "Mehwitz", role: "representative", gender: "female" } };
}

test("IFK-A: direkter Versand — Mail enthält exakt die companion-IFK-ID", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companion: { firstName: "Nadine", lastName: "Mehwitz", role: "representative", ifkId: "IFK7QX", email: "n.mehwitz@its-for-kids.de" },
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "n.mehwitz@its-for-kids.de");
  assert.match(request.recipient.text, /Deine persönliche IFK-ID lautet: IFK7QX\./);
  assert.match(request.recipient.html, /IFK7QX/);
  assert.match(request.humbee.text, /IFK-ID: IFK7QX/);
});

test("IFK-B: alternative Adresse — Empfänger wechselt, IFK-ID bleibt die des Wegbegleiters", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companion: { firstName: "Nadine", lastName: "Mehwitz", role: "representative", ifkId: "IFK7QX", email: "n.mehwitz@its-for-kids.de" },
    alternativeEmail: "mitarbeiterin@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipient.to, "mitarbeiterin@its-for-kids.de");
  assert.match(request.recipient.text, /Deine persönliche IFK-ID lautet: IFK7QX\./);
  assert.match(request.humbee.text, /IFK-ID: IFK7QX/);
  assert.doesNotMatch(request.recipient.text, /undefined/);
});

test("IFK-C: companion-IFK-ID gewinnt gegen einen abweichenden Manifest-Snapshot", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: { person: { firstName: "Max", lastName: "Muster", role: "representative", ifkId: "IFKOLD" } },
    zip: fakeZip(),
    files: fakeFiles(),
    companion: { ifkId: "IFKNEW", email: "max@example.com" },
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(request.recipient.text, /IFK-ID lautet: IFKNEW\./);
  assert.doesNotMatch(request.recipient.text, /IFKOLD/);
  assert.match(request.humbee.text, /IFK-ID: IFKNEW/);
});

test("IFK-D: neu generierte IFK-ID im companion wird verwendet", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companion: { ifkId: "IFK9ZZ", email: "n.mehwitz@its-for-kids.de" },
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(request.recipient.text, /IFK-ID lautet: IFK9ZZ\./);
});

test("IFK-E: ohne jede IFK-ID erscheint kein 'undefined'/'null' und kein IFK-ID-Satz", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companion: { email: "n.mehwitz@its-for-kids.de" },
    logoUrl: "https://example.com/logo.png",
  });

  for (const value of [
    request.recipient.subject,
    request.recipient.text,
    request.recipient.html,
    request.humbee.subject,
    request.humbee.text,
  ]) {
    assert.doesNotMatch(value, /\b(undefined|null|NaN)\b/);
  }
  assert.doesNotMatch(request.recipient.text, /persönliche IFK-ID lautet/);
  assert.doesNotMatch(request.humbee.text, /IFK-ID:/);
});

test("IFK-E2: Fail-safe — ein Platzhalterwert in einem Mailfeld bricht den Versand ab", async () => {
  await assert.rejects(
    () =>
      buildRepresentativeDeliveryRequest({
        manifest: companionManifest(),
        zip: fakeZip(),
        files: fakeFiles(),
        // erzwingt "Hallo undefined," im Text
        companion: { firstName: "undefined", ifkId: "IFK7QX", email: "n.mehwitz@its-for-kids.de" },
        logoUrl: "https://example.com/logo.png",
      }),
    /Platzhalterwert im Mailfeld/
  );
});

for (const role of ["representative", "ambassador", "curator"]) {
  test(`IFK-F: IFK-ID-Logik rollenunabhängig (${role})`, async () => {
    const request = await buildRepresentativeDeliveryRequest({
      manifest: { person: { firstName: "Kim", lastName: "Muster", role } },
      zip: fakeZip(),
      files: fakeFiles(),
      companion: { ifkId: "IFK7QX", email: `${role}@its-for-kids.de` },
      logoUrl: "https://example.com/logo.png",
    });
    assert.match(request.recipient.text, /IFK-ID lautet: IFK7QX\./);
    assert.match(request.humbee.text, /IFK-ID: IFK7QX/);
  });
}

test("companion überschreibt Manifest-Personendaten nur mit nicht-leeren Werten", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: { person: { firstName: "Max", lastName: "Muster", role: "representative", ifkId: "IFK7QX" } },
    zip: fakeZip(),
    files: fakeFiles(),
    companion: { firstName: "  ", ifkId: "", email: "max@example.com" },
    logoUrl: "https://example.com/logo.png",
  });

  // leerer companion.firstName/ifkId lässt die Manifest-Werte unangetastet
  assert.match(request.recipient.text, /Hallo Max,/);
  assert.match(request.recipient.text, /IFK-ID lautet: IFK7QX\./);
});

// ---------------------------------------------------------------------------
// Starter-Set / Du-Sie-Hinweis — buildRepresentativeDeliveryRequest berechnet
// includeFlyerSieHint aus den tatsächlich erzeugten Ansprache-Varianten.
// ---------------------------------------------------------------------------

test("flyerSalutationVariants: ['du'] (Standard-Starter-Set) → Mailtext enthält den Sie-Hinweis", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
    flyerSalutationVariants: ["du"],
  });

  assert.match(request.recipient.text, /grundsätzlich per Du sind/);
});

test("flyerSalutationVariants: ['du','sie'] (Sie bewusst zusätzlich erzeugt) → kein Sie-Hinweis (irreführend, da schon dabei)", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
    flyerSalutationVariants: ["du", "sie"],
  });

  assert.doesNotMatch(request.recipient.text, /grundsätzlich per Du sind/);
});

test("kein flyerSalutationVariants (kein Flyer im Versand, z. B. nur Urkunde) → kein Sie-Hinweis", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.doesNotMatch(request.recipient.text, /grundsätzlich per Du sind/);
});

test("flyerSalutationVariants: ['sie'] (nur Sie separat nacherzeugt, kein Du dabei) → kein Sie-Hinweis (Hinweis wäre inhaltlich falsch)", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    zip: fakeZip(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
    flyerSalutationVariants: ["sie"],
  });

  assert.doesNotMatch(request.recipient.text, /grundsätzlich per Du sind/);
});
