import { test } from "node:test";
import assert from "node:assert/strict";
import { generateQrMaterials } from "./generateQrMaterials.js";
import { buildMaterialManifest } from "./buildMaterialManifest.js";
import { buildGirocodePayload } from "../girocode/buildGirocodePayload.js";
import { GIROCODE_DEFAULTS } from "../config/girocodeDefaults.js";
import { QR_COLOR_GRUEN, QR_COLOR_SCHWARZ } from "../config/colors.js";

const VALID_IFK_ID = "IFK7QX";
const VALID_PAYPAL_URL = "https://www.paypal.com/donate/?hosted_button_id=ABC123";
const FAKE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const FAKE_LOGO_IMAGE = { marker: "logo-image" };

function baseManifest(materials) {
  return buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials,
  });
}

function fakeDeps({ calls } = {}) {
  return {
    createCanvas: () => ({ __fakeCanvas: true }),
    loadImage: async (src) => {
      if (src === "unladbar.png") {
        throw new Error("Bild konnte nicht geladen werden");
      }
      return FAKE_LOGO_IMAGE;
    },
    generateQr: async (canvas, text, logoImage, moduleColor) => {
      if (calls) {
        calls.push({ text, logoImage, moduleColor });
      }
      return `data:image/png;base64,${FAKE_PNG_BASE64}`;
    },
  };
}

test("alle vier QR-Materialien werden in korrekter Reihenfolge erzeugt", async () => {
  const manifest = baseManifest();
  const result = await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps(),
  });

  assert.deepEqual(
    result.map((entry) => entry.key),
    ["QR_PAYPAL_GREEN", "QR_PAYPAL_BLACK", "QR_GIRO_GREEN", "QR_GIRO_BLACK"]
  );
});

test("nur ausgewählte QR-Materialien werden erzeugt", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN"]);
  const result = await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    logo: "logo.png",
    deps: fakeDeps(),
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].key, "QR_PAYPAL_GREEN");
});

test("Manifest mit nur Flyern liefert ein leeres Array, ohne Fehler", async () => {
  const manifest = baseManifest(["FLYER_DRUCKEREI", "FLYER_HOME"]);
  const result = await generateQrMaterials({ manifest });
  assert.deepEqual(result, []);
});

test("Flyer werden ignoriert und nicht als Datei erzeugt", async () => {
  const manifest = baseManifest();
  const result = await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps(),
  });

  const keys = result.map((entry) => entry.key);
  assert.equal(keys.includes("FLYER_DRUCKEREI"), false);
  assert.equal(keys.includes("FLYER_HOME"), false);
  assert.equal(result.length, 4);
});

test("Dateinamen werden unverändert aus dem Manifest übernommen", async () => {
  const manifest = baseManifest();
  const result = await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps(),
  });

  for (const entry of result) {
    const manifestEntry = manifest.materials.find((m) => m.key === entry.key);
    assert.equal(entry.filename, manifestEntry.filename);
  }
});

test("PayPal grün verwendet IFK-Grün und PayPal schwarz verwendet Schwarz", async () => {
  const manifest = baseManifest();
  const calls = [];
  await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  const order = manifest.materials
    .filter((m) => m.category === "qr")
    .map((m) => m.key);

  const greenIndex = order.indexOf("QR_PAYPAL_GREEN");
  const blackIndex = order.indexOf("QR_PAYPAL_BLACK");

  assert.equal(calls[greenIndex].moduleColor, QR_COLOR_GRUEN);
  assert.equal(calls[blackIndex].moduleColor, QR_COLOR_SCHWARZ);
});

test("GiroCode grün verwendet IFK-Grün und GiroCode schwarz verwendet Schwarz", async () => {
  const manifest = baseManifest();
  const calls = [];
  await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  const order = manifest.materials.filter((m) => m.category === "qr").map((m) => m.key);
  const greenIndex = order.indexOf("QR_GIRO_GREEN");
  const blackIndex = order.indexOf("QR_GIRO_BLACK");

  assert.equal(calls[greenIndex].moduleColor, QR_COLOR_GRUEN);
  assert.equal(calls[blackIndex].moduleColor, QR_COLOR_SCHWARZ);
});

test("PayPal-Link wird unverändert als QR-Inhalt für PayPal-Materialien verwendet", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN", "QR_PAYPAL_BLACK"]);
  const calls = [];
  await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  assert.equal(calls[0].text, VALID_PAYPAL_URL);
  assert.equal(calls[1].text, VALID_PAYPAL_URL);
});

test("GiroCode-Payload wird über buildGirocodePayload() erzeugt (inkl. Defaults)", async () => {
  const manifest = baseManifest(["QR_GIRO_GREEN"]);
  const calls = [];
  await generateQrMaterials({
    manifest,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  const expectedPayload = buildGirocodePayload({
    ...GIROCODE_DEFAULTS,
    betrag: "",
    verwendungszweck: `${VALID_IFK_ID} Spende`,
  });

  assert.equal(calls[0].text, expectedPayload);
});

test("GiroCode-Verwendungszweck enthält exakt '<IFK-ID> Spende'", async () => {
  const manifest = baseManifest(["QR_GIRO_GREEN"]);
  const calls = [];
  await generateQrMaterials({
    manifest,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  const lines = calls[0].text.split("\n");
  assert.equal(lines[10], "IFK7QX Spende");
});

test("GiroCode-Betrag bleibt leer, auch wenn im girocode-Parameter ein Betrag übergeben wird", async () => {
  const manifest = baseManifest(["QR_GIRO_GREEN"]);
  const calls = [];
  await generateQrMaterials({
    manifest,
    girocode: { betrag: "50" },
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  const lines = calls[0].text.split("\n");
  assert.equal(lines[7], "");
});

test("Logo-Overlay (logoImage) wird für jede erzeugte Datei an generateQr übergeben", async () => {
  const manifest = baseManifest();
  const calls = [];
  await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps({ calls }),
  });

  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.equal(call.logoImage, FAKE_LOGO_IMAGE);
  }
});

test("jede Datei hat MIME-Typ image/png", async () => {
  const manifest = baseManifest();
  const result = await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps(),
  });

  for (const entry of result) {
    assert.equal(entry.mimeType, "image/png");
  }
});

test("jede Datei hat Inhalt und eine Größe größer null", async () => {
  const manifest = baseManifest();
  const result = await generateQrMaterials({
    manifest,
    paypalUrl: VALID_PAYPAL_URL,
    girocode: {},
    logo: "logo.png",
    deps: fakeDeps(),
  });

  for (const entry of result) {
    assert.ok(entry.content);
    assert.ok(entry.size > 0);
  }
});

test("fehlender PayPal-Link erzeugt nur dann einen Fehler, wenn PayPal-Material ausgewählt ist", async () => {
  const manifestOhnePaypal = baseManifest(["QR_GIRO_GREEN"]);
  await assert.doesNotReject(() =>
    generateQrMaterials({
      manifest: manifestOhnePaypal,
      girocode: {},
      logo: "logo.png",
      deps: fakeDeps(),
    })
  );

  const manifestMitPaypal = baseManifest(["QR_PAYPAL_GREEN"]);
  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest: manifestMitPaypal,
        logo: "logo.png",
        deps: fakeDeps(),
      }),
    /paypalUrl/
  );
});

test("fehlende GiroCode-Daten erzeugen nur dann einen Fehler, wenn GiroCode-Material ausgewählt ist", async () => {
  const manifestOhneGiro = baseManifest(["QR_PAYPAL_GREEN"]);
  await assert.doesNotReject(() =>
    generateQrMaterials({
      manifest: manifestOhneGiro,
      paypalUrl: VALID_PAYPAL_URL,
      logo: "logo.png",
      deps: fakeDeps(),
    })
  );

  const manifestMitGiro = baseManifest(["QR_GIRO_GREEN"]);
  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest: manifestMitGiro,
        logo: "logo.png",
        deps: fakeDeps(),
      }),
    /girocode/
  );
});

test("ungültiger PayPal-Link erzeugt einen Fehler", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN"]);
  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest,
        paypalUrl: "https://example.com/not-paypal",
        logo: "logo.png",
        deps: fakeDeps(),
      }),
    /gültiger PayPal-Link/
  );
});

test("fehlendes oder nicht ladbares Logo erzeugt einen Fehler", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN"]);

  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest,
        paypalUrl: VALID_PAYPAL_URL,
        deps: fakeDeps(),
      }),
    /'logo' ist erforderlich/
  );

  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest,
        paypalUrl: VALID_PAYPAL_URL,
        logo: "unladbar.png",
        deps: fakeDeps(),
      }),
    /Logo konnte nicht geladen werden/
  );
});

test("fehlendes oder ungültiges Manifest erzeugt einen Fehler", async () => {
  await assert.rejects(() => generateQrMaterials({}), /manifest/);
  await assert.rejects(() => generateQrMaterials({ manifest: { person: {} } }), /manifest/);
});

test("ungültige IFK-ID im Manifest erzeugt einen Fehler", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN"]);
  manifest.person.ifkId = "INVALID";

  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest,
        paypalUrl: VALID_PAYPAL_URL,
        logo: "logo.png",
        deps: fakeDeps(),
      }),
    /ungültige IFK-ID/
  );
});

test("unbekannter QR-Materialtyp erzeugt einen Fehler", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN"]);
  manifest.materials.push({
    key: "QR_UNKNOWN_TYPE",
    label: "Unbekannt",
    category: "qr",
    format: "png",
    extension: "png",
    filename: "IFK_Max_Mustermann_Unbekannt.png",
  });

  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest,
        paypalUrl: VALID_PAYPAL_URL,
        logo: "logo.png",
        deps: fakeDeps(),
      }),
    /unbekannter QR-Materialtyp/
  );
});

test("fehlender Dateiname im Manifest erzeugt einen Fehler", async () => {
  const manifest = baseManifest(["QR_PAYPAL_GREEN"]);
  delete manifest.materials[0].filename;

  await assert.rejects(
    () =>
      generateQrMaterials({
        manifest,
        paypalUrl: VALID_PAYPAL_URL,
        logo: "logo.png",
        deps: fakeDeps(),
      }),
    /fehlender Dateiname/
  );
});
