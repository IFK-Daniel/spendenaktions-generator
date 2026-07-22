import { test } from "node:test";
import assert from "node:assert/strict";
import { getRepresentativeRoleLabel } from "./getRepresentativeRoleLabel.js";

test("'male' ergibt 'Repräsentant'", () => {
  assert.equal(getRepresentativeRoleLabel("male"), "Repräsentant");
});

test("'female' ergibt 'Repräsentantin'", () => {
  assert.equal(getRepresentativeRoleLabel("female"), "Repräsentantin");
});

test("fehlende Angabe ergibt 'Repräsentant' (Fallback)", () => {
  assert.equal(getRepresentativeRoleLabel(undefined), "Repräsentant");
});
