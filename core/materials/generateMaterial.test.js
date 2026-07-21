import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMaterial } from "./generateMaterial.js";

// Minimales gültiges 1x1-PNG (Base64), nur für Testzwecke.
const FAKE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function fakeDeps({ pngBase64 = FAKE_PNG_BASE64, calls } = {}) {
  return {
    createCanvas: () => ({ __fakeCanvas: true }),
    generateQr: async (canvas, text, logoImage, moduleColor) => {
      if (calls) {
        calls.push({ canvas, text, logoImage, moduleColor });
      }
      return `data:image/png;base64,${pngBase64}`;
    },
  };
}

const BASE_ENTRY = {
  key: "QR_PAYPAL_GREEN",
  label: "PayPal QR grün",
  category: "qr",
  format: "png",
  extension: "png",
  filename: "IFK_Max_Mustermann_PayPal_QR_gruen.png",
};

test("erzeugt eine Datei mit MIME image/png, Inhalt und Größe > 0", async () => {
  const file = await generateMaterial({
    entry: BASE_ENTRY,
    content: "https://www.paypal.com/donate/?hosted_button_id=ABC",
    moduleColor: "#8CC140",
    logoImage: { fake: true },
    deps: fakeDeps(),
  });

  assert.equal(file.mimeType, "image/png");
  assert.ok(file.content);
  assert.ok(file.size > 0);
});

test("übernimmt key, label, category, format, extension, filename unverändert aus dem Eintrag", async () => {
  const file = await generateMaterial({
    entry: BASE_ENTRY,
    content: "text",
    moduleColor: "#000000",
    logoImage: {},
    deps: fakeDeps(),
  });

  assert.equal(file.key, BASE_ENTRY.key);
  assert.equal(file.label, BASE_ENTRY.label);
  assert.equal(file.category, BASE_ENTRY.category);
  assert.equal(file.format, BASE_ENTRY.format);
  assert.equal(file.extension, BASE_ENTRY.extension);
  assert.equal(file.filename, BASE_ENTRY.filename);
});

test("ruft generateQr mit canvas, Inhalt, Logo und Modulfarbe auf", async () => {
  const calls = [];
  const logoImage = { marker: "logo" };
  await generateMaterial({
    entry: BASE_ENTRY,
    content: "mein-inhalt",
    moduleColor: "#8CC140",
    logoImage,
    deps: fakeDeps({ calls }),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, "mein-inhalt");
  assert.equal(calls[0].moduleColor, "#8CC140");
  assert.equal(calls[0].logoImage, logoImage);
  assert.ok(calls[0].canvas);
});

test("wirft Fehler bei fehlendem Dateinamen im Eintrag", async () => {
  const { filename, ...entryWithoutFilename } = BASE_ENTRY;
  await assert.rejects(
    () =>
      generateMaterial({
        entry: entryWithoutFilename,
        content: "text",
        moduleColor: "#000000",
        logoImage: {},
        deps: fakeDeps(),
      }),
    /Dateiname/
  );
});

test("wirft Fehler bei leerem erzeugtem Dateiinhalt", async () => {
  await assert.rejects(
    () =>
      generateMaterial({
        entry: BASE_ENTRY,
        content: "text",
        moduleColor: "#000000",
        logoImage: {},
        deps: fakeDeps({ pngBase64: "" }),
      }),
    /leer/
  );
});

test("wirft Fehler bei unerwartetem Datenformat der erzeugten Grafik", async () => {
  const deps = {
    createCanvas: () => ({}),
    generateQr: async () => "nicht-eine-data-url",
  };
  await assert.rejects(
    () =>
      generateMaterial({
        entry: BASE_ENTRY,
        content: "text",
        moduleColor: "#000000",
        logoImage: {},
        deps,
      }),
    /Datenformat/
  );
});
