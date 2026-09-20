import {
  REPRESENTATIVE_FLYER_FRONT_FIELDS,
  REPRESENTATIVE_FLYER_FRONT_FONTS,
  REPRESENTATIVE_FLYER_FRONT_PAGE,
} from "./representativeFlyerFrontBase.js";

/**
 * Gemeinsame Seiten-, Schrift- und Feld-Definition für ALLE Wegbegleiter-
 * Flyer-Vorderseiten außer dem Repräsentanten (Botschafter, Beirat,
 * Fachrat, Kuratorium, Wirtschaftsrat × Geschlecht × Ansprache = 20
 * Master, `Medien/Flyer_*.pdf`, Sept. 2026).
 *
 * Alle 20 Master sind geometrisch identisch (per PyMuPDF vermessen,
 * 148×210mm, kein Anschnitt) und weichen nur GERINGFÜGIG vom
 * Repräsentanten-Master ab — Rollenzeile y=40.9mm statt 41.5mm
 * (−0.6mm), Kontaktbeschriftung "Telefon"/"E-Mail" y=68.1mm statt
 * 68.4mm (−0.3mm), beide QR-Flächen 0.2mm weiter links
 * (x=13.9/81.2 statt 14.1/81.4mm; Fläche 20.6mm, y=99.6mm unverändert).
 * Foto-Kreis (7.9/32.9mm, 31.2mm) identisch. Deshalb werden die
 * Repräsentanten-Koordinaten (`representativeFlyerFrontBase.js`) mit
 * genau diesen gemessenen Versätzen übernommen, statt neu zu schätzen.
 *
 * Kein Regionsfeld: die neuen Master haben keine Regionszeile (der
 * Fließtext beginnt direkt unter der Rollenzeile, y=47.7mm) und die
 * Gremien-Rollen haben `requiresRegion: false` — das `region`-Feld
 * entfällt daher hier vollständig.
 */

const ROLE_LINE_SHIFT_MM = -0.6;
const CONTACT_SHIFT_MM = -0.3;
const QR_SHIFT_X_MM = -0.2;

const { photo, name, phone, email, qrPaypal, qrGiro } = REPRESENTATIVE_FLYER_FRONT_FIELDS;

export const COMPANION_FLYER_FRONT_PAGE = REPRESENTATIVE_FLYER_FRONT_PAGE;
export const COMPANION_FLYER_FRONT_FONTS = REPRESENTATIVE_FLYER_FRONT_FONTS;

export const COMPANION_FLYER_FRONT_FIELDS = Object.freeze({
  photo,
  name: Object.freeze({ ...name, yMm: name.yMm + ROLE_LINE_SHIFT_MM }),
  phone: Object.freeze({ ...phone, yMm: phone.yMm + CONTACT_SHIFT_MM }),
  email: Object.freeze({ ...email, yMm: email.yMm + CONTACT_SHIFT_MM }),
  qrPaypal: Object.freeze({ ...qrPaypal, xMm: qrPaypal.xMm + QR_SHIFT_X_MM }),
  qrGiro: Object.freeze({ ...qrGiro, xMm: qrGiro.xMm + QR_SHIFT_X_MM }),
});

/**
 * @param {{ key: string, label: string, background: URL, page?: object }} params
 *   `page` nur für die Druckerei-Fassung (Beschnitt) überschreiben.
 */
export function buildCompanionFlyerFrontTemplate({ key, label, background, page = COMPANION_FLYER_FRONT_PAGE }) {
  return Object.freeze({
    key,
    label,
    background,
    page,
    fonts: COMPANION_FLYER_FRONT_FONTS,
    legacyContentCovers: Object.freeze([]),
    fields: COMPANION_FLYER_FRONT_FIELDS,
  });
}
