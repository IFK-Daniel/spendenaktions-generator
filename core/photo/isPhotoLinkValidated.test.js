import { test } from "node:test";
import assert from "node:assert/strict";
import { isPhotoLinkValidated } from "./isPhotoLinkValidated.js";

test("erfolgreich geladenes Foto zum aktuellen Link gilt als erledigt", () => {
  assert.equal(
    isPhotoLinkValidated({ lastPhoto: { ok: true }, lastPhotoUrl: "https://a.test/x.jpg", currentValue: "https://a.test/x.jpg" }),
    true
  );
});

test("kein geladenes Foto gilt nicht als erledigt", () => {
  assert.equal(
    isPhotoLinkValidated({ lastPhoto: null, lastPhotoUrl: null, currentValue: "" }),
    false
  );
});

test("leeres Feld gilt nicht als erledigt, auch nicht mit stale lastPhoto", () => {
  assert.equal(
    isPhotoLinkValidated({ lastPhoto: { ok: true }, lastPhotoUrl: "https://a.test/x.jpg", currentValue: "" }),
    false
  );
});

test("geänderter Link (noch nicht neu geprüft) gilt nicht mehr als erledigt", () => {
  assert.equal(
    isPhotoLinkValidated({ lastPhoto: { ok: true }, lastPhotoUrl: "https://a.test/x.jpg", currentValue: "https://a.test/y.jpg" }),
    false
  );
});
