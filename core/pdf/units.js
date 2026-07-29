const PT_PER_MM = 72 / 25.4;

/** Rechnet Millimeter in PDF-Punkte (1/72 Zoll) um. */
export function mmToPt(mm) {
  return mm * PT_PER_MM;
}

/** Rechnet PDF-Punkte in Millimeter um. */
export function ptToMm(pt) {
  return pt / PT_PER_MM;
}
