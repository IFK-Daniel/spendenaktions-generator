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

function fakeFiles() {
  return [
    { key: "PAYPAL_QR", label: "PayPal QR", category: "qr", filename: "IFK_Max_Mustermann_PayPal_QR_gruen.png", content: new Blob(["grün"]) },
    { key: "GIROCODE", label: "GiroCode", category: "qr", filename: "IFK_Max_Mustermann_GiroCode_schwarz.png", content: new Blob(["schwarz"]) },
  ];
}

function fakeCertificateFile() {
  return { key: "CERTIFICATE", label: "Urkunde", category: "certificate", filename: "IFK_Max_Mustermann_Urkunde.pdf", content: new Blob(["urkunde"]) };
}

function findByKind(parts, kind) {
  return parts.find((part) => part.kind === kind);
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
// buildRepresentativeDeliveryRequest — Materialien-Teil (kind: "materials")
// ---------------------------------------------------------------------------

test("buildRepresentativeDeliveryRequest: Standardempfänger stammt aus companionEmail", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  assert.equal(materials.to, "max@example.com");
});

test("E: nachträglich geänderter Formularwert gewinnt (kein Snapshot)", async () => {
  // Manifest wurde mit alt@example.de erzeugt, Formular steht jetzt auf neu@example.de.
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ email: "alt@example.de" }),
    files: fakeFiles(),
    companionEmail: "neu@example.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(findByKind(request.recipientMailParts, "materials").to, "neu@example.de");
});

test("F: screenshot-importierte Adresse im Formular wird verwendet", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "ocr.import@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(findByKind(request.recipientMailParts, "materials").to, "ocr.import@its-for-kids.de");
});

test("G: abweichende Adresse überschreibt den Wegbegleiter-Wert", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    alternativeEmail: "mitarbeiter@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(findByKind(request.recipientMailParts, "materials").to, "mitarbeiter@example.com");
});

test("H: ungültige abweichende Adresse wirft mit code ALTERNATIVE_EMAIL_INVALID", async () => {
  await assert.rejects(
    () =>
      buildRepresentativeDeliveryRequest({
        manifest: fakeManifest(),
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
    files: fakeFiles(),
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(findByKind(request.recipientMailParts, "materials").to, "fallback@example.com");
});

test("Empfänger erhält genau das ZIP-Archiv als rohen Blob (kein Base64), keine Einzeldateien", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  assert.match(materials.attachmentFilename, /^IFK_Materialien_.*\.zip$/);
  assert.ok(materials.attachmentBlob instanceof Blob);
  assert.ok(materials.attachmentBlob.size > 0);
  assert.deepEqual(Object.keys(materials).sort(), [
    "attachmentBlob",
    "attachmentFilename",
    "html",
    "kind",
    "subject",
    "text",
    "to",
  ]);
});

test("humbee (Materialien) erhält die Einzeldateien als rohe Blobs (kein Base64) und keine ZIP-Datei, keine Anleitung", async () => {
  const files = fakeFiles();
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files,
    guideFile: { filename: "Hinweise_zur_Verwendung.pdf", content: new Blob(["anleitung"]) },
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  assert.equal(humbeeMaterials.attachments.length, files.length);
  assert.deepEqual(
    humbeeMaterials.attachments.map((att) => att.filename),
    files.map((file) => file.filename)
  );
  for (const attachment of humbeeMaterials.attachments) {
    assert.ok(attachment.content instanceof Blob);
    assert.ok(attachment.content.size > 0);
  }
  assert.ok(!humbeeMaterials.attachments.some((att) => att.filename.includes("Hinweise")));
});

test("Anleitung landet nur im ZIP der Empfänger-Mail, nicht bei humbee", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    guideFile: { filename: "Hinweise_zur_Verwendung.pdf", content: new Blob(["anleitung"]) },
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  assert.ok(materials.attachmentBlob.size > 0);
  assert.equal(humbeeMaterials.attachments.length, fakeFiles().length);
});

test("Repräsentanten-Flyer mit beiden Ansprachevarianten — humbee erhält BEIDE Dateien vollständig, keine geht verloren", async () => {
  const flyerFiles = [
    { key: "FLYER_HOME", label: "Flyer Home – Du", category: "flyer", filename: "IFK_Max_Mustermann_Flyer_Home_Du.pdf", content: new Blob(["du"]) },
    { key: "FLYER_HOME", label: "Flyer Home – Sie", category: "flyer", filename: "IFK_Max_Mustermann_Flyer_Home_Sie.pdf", content: new Blob(["sie"]) },
  ];
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: flyerFiles,
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  assert.equal(humbeeMaterials.attachments.length, 2);
  assert.deepEqual(
    humbeeMaterials.attachments.map((att) => att.filename),
    ["IFK_Max_Mustermann_Flyer_Home_Du.pdf", "IFK_Max_Mustermann_Flyer_Home_Sie.pdf"]
  );
});

test("humbee-Empfänger und -Betreff (Materialien) werden aus dem Manifest gebildet, mit Materialversand-Kennzeichnung", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  assert.equal(humbeeMaterials.to, "office@its-for-kids.de");
  assert.equal(humbeeMaterials.subject, "Repräsentant Bayern / Regensburg Land / Mustermann, Max – Materialversand");
});

test("gender 'female' erzeugt 'Repräsentantin' im Mailtext an den Wegbegleiter", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ gender: "female", firstName: "Anna" }),
    files: fakeFiles(),
    companionEmail: "anna@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(findByKind(request.recipientMailParts, "materials").text, /Repräsentantin/);
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
    files: fakeFiles(),
    companionEmail: "anna.botschafter@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  assert.equal(materials.to, "anna.botschafter@its-for-kids.de");
  assert.match(materials.text, /Botschafterin/);
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
    files: fakeFiles(),
    companionEmail: "kurator@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  assert.equal(materials.to, "kurator@its-for-kids.de");
  assert.match(materials.text, /Einsatz als Kurator von It's for Kids/);
  assert.doesNotMatch(materials.text, /Repräsentant/);
  assert.equal(findByKind(request.humbeeMailParts, "materials").subject, "Kurator / Feigenbutz, Daniel – Materialversand");
});

test("D: Beirat/Fachrat/Wirtschaftsrat — rollenunabhängige Empfängerauflösung", async () => {
  for (const role of ["advisory_board", "expert_council", "economic_council"]) {
    const request = await buildRepresentativeDeliveryRequest({
      manifest: {
        person: { firstName: "Kim", lastName: "Muster", ifkId: "IFK7QX", role },
      },
      files: fakeFiles(),
      companionEmail: `${role}@its-for-kids.de`,
      logoUrl: "https://example.com/logo.png",
    });
    assert.equal(findByKind(request.recipientMailParts, "materials").to, `${role}@its-for-kids.de`);
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
    files: fakeFiles(),
    companion: { firstName: "Nadine", lastName: "Mehwitz", role: "representative", ifkId: "IFK7QX", email: "n.mehwitz@its-for-kids.de" },
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  assert.equal(materials.to, "n.mehwitz@its-for-kids.de");
  assert.match(materials.text, /Deine persönliche IFK-ID lautet: IFK7QX\./);
  assert.match(materials.html, /IFK7QX/);
  assert.match(humbeeMaterials.text, /IFK-ID: IFK7QX/);
});

test("IFK-B: alternative Adresse — Empfänger wechselt, IFK-ID bleibt die des Wegbegleiters", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    files: fakeFiles(),
    companion: { firstName: "Nadine", lastName: "Mehwitz", role: "representative", ifkId: "IFK7QX", email: "n.mehwitz@its-for-kids.de" },
    alternativeEmail: "mitarbeiterin@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  assert.equal(materials.to, "mitarbeiterin@its-for-kids.de");
  assert.match(materials.text, /Deine persönliche IFK-ID lautet: IFK7QX\./);
  assert.match(findByKind(request.humbeeMailParts, "materials").text, /IFK-ID: IFK7QX/);
  assert.doesNotMatch(materials.text, /undefined/);
});

test("IFK-C: companion-IFK-ID gewinnt gegen einen abweichenden Manifest-Snapshot", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: { person: { firstName: "Max", lastName: "Muster", role: "representative", ifkId: "IFKOLD" } },
    files: fakeFiles(),
    companion: { ifkId: "IFKNEW", email: "max@example.com" },
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  assert.match(materials.text, /IFK-ID lautet: IFKNEW\./);
  assert.doesNotMatch(materials.text, /IFKOLD/);
  assert.match(findByKind(request.humbeeMailParts, "materials").text, /IFK-ID: IFKNEW/);
});

test("IFK-D: neu generierte IFK-ID im companion wird verwendet", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    files: fakeFiles(),
    companion: { ifkId: "IFK9ZZ", email: "n.mehwitz@its-for-kids.de" },
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(findByKind(request.recipientMailParts, "materials").text, /IFK-ID lautet: IFK9ZZ\./);
});

test("IFK-E: ohne jede IFK-ID erscheint kein 'undefined'/'null' und kein IFK-ID-Satz", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: companionManifest(),
    files: fakeFiles(),
    companion: { email: "n.mehwitz@its-for-kids.de" },
    logoUrl: "https://example.com/logo.png",
  });

  const materials = findByKind(request.recipientMailParts, "materials");
  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  for (const value of [materials.subject, materials.text, materials.html, humbeeMaterials.subject, humbeeMaterials.text]) {
    assert.doesNotMatch(value, /\b(undefined|null|NaN)\b/);
  }
  assert.doesNotMatch(materials.text, /persönliche IFK-ID lautet/);
  assert.doesNotMatch(humbeeMaterials.text, /IFK-ID:/);
});

test("IFK-E2: Fail-safe — ein Platzhalterwert in einem Mailfeld bricht den Versand ab", async () => {
  await assert.rejects(
    () =>
      buildRepresentativeDeliveryRequest({
        manifest: companionManifest(),
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
      files: fakeFiles(),
      companion: { ifkId: "IFK7QX", email: `${role}@its-for-kids.de` },
      logoUrl: "https://example.com/logo.png",
    });
    assert.match(findByKind(request.recipientMailParts, "materials").text, /IFK-ID lautet: IFK7QX\./);
    assert.match(findByKind(request.humbeeMailParts, "materials").text, /IFK-ID: IFK7QX/);
  });
}

test("companion überschreibt Manifest-Personendaten nur mit nicht-leeren Werten", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: { person: { firstName: "Max", lastName: "Muster", role: "representative", ifkId: "IFK7QX" } },
    files: fakeFiles(),
    companion: { firstName: "  ", ifkId: "", email: "max@example.com" },
    logoUrl: "https://example.com/logo.png",
  });

  // leerer companion.firstName/ifkId lässt die Manifest-Werte unangetastet
  const materials = findByKind(request.recipientMailParts, "materials");
  assert.match(materials.text, /Hallo Max,/);
  assert.match(materials.text, /IFK-ID lautet: IFK7QX\./);
});

// ---------------------------------------------------------------------------
// Starter-Set / Du-Sie-Hinweis — buildRepresentativeDeliveryRequest berechnet
// includeFlyerSieHint aus den tatsächlich erzeugten Ansprache-Varianten.
// ---------------------------------------------------------------------------

test("flyerSalutationVariants: ['du'] (Standard-Starter-Set) → Mailtext enthält den Sie-Hinweis", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
    flyerSalutationVariants: ["du"],
  });

  assert.match(findByKind(request.recipientMailParts, "materials").text, /grundsätzlich duzen/);
});

test("flyerSalutationVariants: ['du','sie'] (Sie bewusst zusätzlich erzeugt) → kein Sie-Hinweis (irreführend, da schon dabei)", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
    flyerSalutationVariants: ["du", "sie"],
  });

  assert.doesNotMatch(findByKind(request.recipientMailParts, "materials").text, /grundsätzlich duzen/);
});

test("kein flyerSalutationVariants (kein Flyer im Versand, z. B. nur Urkunde) → kein Sie-Hinweis", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.doesNotMatch(findByKind(request.recipientMailParts, "materials").text, /grundsätzlich duzen/);
});

test("flyerSalutationVariants: ['sie'] (nur Sie separat nacherzeugt, kein Du dabei) → kein Sie-Hinweis (Hinweis wäre inhaltlich falsch)", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
    flyerSalutationVariants: ["sie"],
  });

  assert.doesNotMatch(findByKind(request.recipientMailParts, "materials").text, /grundsätzlich duzen/);
});

// ---------------------------------------------------------------------------
// Trennung Materialien/Urkunde (siehe roleConfig.js, CERTIFICATE_DELIVERY_MODES)
// ---------------------------------------------------------------------------

test("nur Materialien ausgewählt → genau 1 Empfänger-Mail (materials), keine Urkunden-Mail, blockedCertificate null", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: fakeFiles(),
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipientMailParts.length, 1);
  assert.equal(request.recipientMailParts[0].kind, "materials");
  assert.equal(request.humbeeMailParts.length, 1);
  assert.equal(request.blockedCertificate, null);
});

test("nur Urkunde ausgewählt (Repräsentant) → genau 1 Empfänger-Mail (certificate), keine Materialien-Mail", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: [fakeCertificateFile()],
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipientMailParts.length, 1);
  assert.equal(request.recipientMailParts[0].kind, "certificate");
  assert.equal(request.humbeeMailParts.length, 1);
  assert.equal(request.humbeeMailParts[0].kind, "certificate");
  assert.equal(request.blockedCertificate, null);
});

test("Repräsentant: Materialien + Urkunde → automatisch 2 Empfänger-Mails und 2 humbee-Mails, beide an denselben Empfänger", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: [...fakeFiles(), fakeCertificateFile()],
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipientMailParts.length, 2);
  assert.equal(request.humbeeMailParts.length, 2);
  const materials = findByKind(request.recipientMailParts, "materials");
  const certificate = findByKind(request.recipientMailParts, "certificate");
  assert.ok(materials);
  assert.ok(certificate);
  assert.equal(materials.to, certificate.to);
});

test("Urkunden-Mail enthält NUR die Urkunde, keine Flyer/QR-Codes; Materialien-Mail enthält NIE die Urkunde", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: [...fakeFiles(), fakeCertificateFile()],
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  const certificate = findByKind(request.recipientMailParts, "certificate");
  assert.equal(certificate.attachmentFilename, "IFK_Max_Mustermann_Urkunde.pdf");

  const humbeeCertificate = findByKind(request.humbeeMailParts, "certificate");
  assert.equal(humbeeCertificate.attachments.length, 1);
  assert.equal(humbeeCertificate.attachments[0].filename, "IFK_Max_Mustermann_Urkunde.pdf");

  const humbeeMaterials = findByKind(request.humbeeMailParts, "materials");
  assert.ok(!humbeeMaterials.attachments.some((att) => att.filename.includes("Urkunde")));
});

test("Urkunden-Mail: Betreff gendered, Text ohne IFK-ID/technische Details", async () => {
  const male = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ gender: "male" }),
    files: [fakeCertificateFile()],
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });
  assert.equal(findByKind(male.recipientMailParts, "certificate").subject, "Deine Urkunde als Repräsentant von It's for Kids");

  const female = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest({ gender: "female", firstName: "Anna" }),
    files: [fakeCertificateFile()],
    companionEmail: "anna@example.com",
    logoUrl: "https://example.com/logo.png",
  });
  const certificateFemale = findByKind(female.recipientMailParts, "certificate");
  assert.equal(certificateFemale.subject, "Deine Urkunde als Repräsentantin von It's for Kids");
  assert.doesNotMatch(certificateFemale.text, /IFK-ID/);
});

test("humbee: Materialien- und Urkunden-Dokumentation sind getrennte Mails mit erkennbarem Betreff-Zusatz", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: fakeManifest(),
    files: [...fakeFiles(), fakeCertificateFile()],
    companionEmail: "max@example.com",
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(findByKind(request.humbeeMailParts, "materials").subject, /Materialversand$/);
  assert.match(findByKind(request.humbeeMailParts, "certificate").subject, /Urkundenversand$/);
});

test("nicht-repräsentative Rolle (blocked): Urkunde wird NICHT versendet — auch nicht bei manipuliertem Aufruf", async () => {
  for (const role of ["ambassador", "curator", "advisory_board", "expert_council", "economic_council"]) {
    const request = await buildRepresentativeDeliveryRequest({
      manifest: { person: { firstName: "Kim", lastName: "Muster", ifkId: "IFK7QX", role, gender: "male" } },
      files: [...fakeFiles(), fakeCertificateFile()],
      companionEmail: `${role}@its-for-kids.de`,
      logoUrl: "https://example.com/logo.png",
    });

    // Kern-Verteidigung: selbst wenn die Urkunde in `files` steckt (z. B.
    // durch einen manipulierten Aufruf), entsteht dafür NIE ein Mail-Teil.
    assert.equal(request.recipientMailParts.length, 1);
    assert.equal(request.recipientMailParts[0].kind, "materials");
    assert.equal(request.humbeeMailParts.length, 1);
    assert.equal(request.humbeeMailParts[0].kind, "materials");
    assert.ok(request.blockedCertificate);
    assert.equal(request.blockedCertificate.key, "CERTIFICATE");
  }
});

test("nicht-repräsentative Rolle: nur Urkunde ausgewählt (kein Material) → keine Mail-Teile, blockedCertificate gesetzt", async () => {
  const request = await buildRepresentativeDeliveryRequest({
    manifest: { person: { firstName: "Kim", lastName: "Muster", ifkId: "IFK7QX", role: "ambassador", gender: "male" } },
    files: [fakeCertificateFile()],
    companionEmail: "ambassador@its-for-kids.de",
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(request.recipientMailParts.length, 0);
  assert.equal(request.humbeeMailParts.length, 0);
  assert.ok(request.blockedCertificate);
});
