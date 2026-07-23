import { test } from "node:test";
import assert from "node:assert/strict";
import { validateExtractedPaypalUrl } from "./validateExtractedPaypalUrl.js";

test("gültige PayPal-HTTPS-URL wird als erkannt markiert", () => {
  const result = validateExtractedPaypalUrl("https://www.paypal.com/donate/?hosted_button_id=ABC123");
  assert.deepEqual(result, {
    value: "https://www.paypal.com/donate/?hosted_button_id=ABC123",
    status: "recognized",
  });
});

test("abgeschnittene PayPal-URL wird als prüfbedürftig markiert", () => {
  const result = validateExtractedPaypalUrl("paypal.com/donate/?hosted_button");
  assert.equal(result.status, "needs_review");
});

test("leerer Wert gilt als nicht erkannt", () => {
  assert.deepEqual(validateExtractedPaypalUrl(""), { value: "", status: "not_recognized" });
});

test("URL ohne PayPal-Bezug gilt als nicht erkannt", () => {
  assert.deepEqual(validateExtractedPaypalUrl("https://example.com/foo"), {
    value: "",
    status: "not_recognized",
  });
});
