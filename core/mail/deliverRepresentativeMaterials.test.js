import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverRepresentativeMaterials } from "./deliverRepresentativeMaterials.js";

const PII = {
  recipientTo: "max.mustermann@example.com",
  recipientSubject: "Deine personalisierten Materialien von It's for Kids",
  recipientText: "Hallo Max, hier sind deine Materialien. Deine IFK-ID lautet IFK7QX.",
  humbeeTo: "office@its-for-kids.de",
  humbeeSubject: "Repräsentant Bayern / Regensburg Land / Mustermann, Max",
  humbeeText: "Für Max Mustermann wurden personalisierte Materialien erstellt und versendet. IFK-ID: IFK7QX",
  zipFilename: "IFK_Materialien_IFK7QX_Max_Mustermann.zip",
  attachmentFilenames: ["IFK_Max_Mustermann_PayPal_QR_gruen.png", "IFK_Max_Mustermann_GiroCode_schwarz.png"],
};

function fakeRequest() {
  return {
    recipient: {
      to: PII.recipientTo,
      subject: PII.recipientSubject,
      text: PII.recipientText,
      html: `<p>${PII.recipientText}</p>`,
      zipFilename: PII.zipFilename,
      zipContent: Buffer.from("zip-inhalt"),
    },
    humbee: {
      to: PII.humbeeTo,
      subject: PII.humbeeSubject,
      text: PII.humbeeText,
      attachments: PII.attachmentFilenames.map((filename) => ({ filename, content: Buffer.from(filename) })),
    },
  };
}

function fakeLogger() {
  const lines = [];
  return { lines, log: (message) => lines.push(message) };
}

function alwaysSucceeds() {
  let callCount = 0;
  const calls = [];
  const sendMail = async (mail) => {
    callCount += 1;
    calls.push(mail);
    return { messageId: `<msg-${callCount}@example.com>`, response: "250 2.0.0 OK", rejected: [] };
  };
  return { sendMail, calls, callCountRef: () => callCount };
}

test("beide Versandaufrufe werden durchgeführt", async () => {
  const { sendMail, calls } = alwaysSucceeds();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  assert.equal(calls.length, 2);
});

test("erster Versand erfolgreich, humbee erfolgreich: ok=true, beide success mit messageId", async () => {
  const { sendMail } = alwaysSucceeds();
  const result = await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  assert.equal(result.ok, true);
  assert.equal(result.representative.success, true);
  assert.equal(result.humbee.success, true);
  assert.match(result.representative.messageId, /^<msg-1@/);
  assert.match(result.humbee.messageId, /^<msg-2@/);
});

test("erster Versand erfolgreich, humbee fehlgeschlagen: ok=false, nur humbee mit Fehler", async () => {
  let callCount = 0;
  const sendMail = async () => {
    callCount += 1;
    if (callCount === 1) {
      return { messageId: "<rep@example.com>", response: "250 OK" };
    }
    throw new Error("SMTP rejected");
  };
  const result = await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  assert.equal(result.ok, false);
  assert.equal(result.representative.success, true);
  assert.equal(result.humbee.success, false);
  assert.ok(result.humbee.error);
  assert.equal(callCount, 2);
});

test("erster Versand fehlgeschlagen: humbee wird trotzdem ausgeführt", async () => {
  let callCount = 0;
  const calls = [];
  const sendMail = async (mail) => {
    callCount += 1;
    calls.push(mail);
    if (callCount === 1) {
      throw new Error("SMTP down");
    }
    return { messageId: "<humbee@example.com>", response: "250 OK" };
  };
  const result = await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  assert.equal(callCount, 2, "humbee-Versand muss trotz fehlgeschlagenem Repräsentanten-Versand ausgeführt werden");
  assert.equal(result.representative.success, false);
  assert.equal(result.humbee.success, true);
  assert.equal(calls[1].to, PII.humbeeTo);
});

test("ein von der SMTP-Antwort abgelehnter Empfänger gilt als Fehlschlag, auch ohne geworfenen Fehler", async () => {
  const sendMail = async () => ({ messageId: "<x@example.com>", response: "250 OK", rejected: ["irgendwer@example.com"] });
  const result = await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  assert.equal(result.representative.success, false);
  assert.equal(result.humbee.success, false);
});

test("humbee erhält exakt die übergebenen Einzeldateien und keine ZIP-Datei", async () => {
  const { sendMail, calls } = alwaysSucceeds();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  const humbeeMail = calls[1];
  assert.equal(humbeeMail.attachments.length, PII.attachmentFilenames.length);
  assert.deepEqual(
    humbeeMail.attachments.map((att) => att.filename),
    PII.attachmentFilenames
  );
  assert.ok(!humbeeMail.attachments.some((att) => att.filename === PII.zipFilename));
  assert.ok(!("zipFilename" in humbeeMail));
  assert.ok(!("zipContent" in humbeeMail));
});

test("Repräsentant erhält genau einen Anhang (das ZIP-Archiv)", async () => {
  const { sendMail, calls } = alwaysSucceeds();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger: fakeLogger() });

  const representativeMail = calls[0];
  assert.equal(representativeMail.attachments.length, 1);
  assert.equal(representativeMail.attachments[0].filename, PII.zipFilename);
  assert.equal(representativeMail.attachments[0].contentType, "application/zip");
});

test("Logs unterscheiden eindeutig zwischen representative- und humbee-Versand", async () => {
  const { sendMail } = alwaysSucceeds();
  const logger = fakeLogger();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger });

  const representativeLines = logger.lines.filter((line) => line.includes("representative mail delivery"));
  const humbeeLines = logger.lines.filter((line) => line.includes("humbee mail delivery"));

  assert.ok(representativeLines.some((line) => line.includes("started")));
  assert.ok(representativeLines.some((line) => line.includes("accepted")));
  assert.ok(humbeeLines.some((line) => line.includes("started")));
  assert.ok(humbeeLines.some((line) => line.includes("accepted")));
});

test("Logs enthalten keine Empfängeradressen, Betreffs, Dateinamen oder Mailtexte", async () => {
  const { sendMail } = alwaysSucceeds();
  const logger = fakeLogger();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger });

  const allLogText = logger.lines.join("\n");

  assert.ok(!allLogText.includes(PII.recipientTo));
  assert.ok(!allLogText.includes(PII.humbeeTo));
  assert.ok(!allLogText.includes(PII.recipientSubject));
  assert.ok(!allLogText.includes(PII.humbeeSubject));
  assert.ok(!allLogText.includes(PII.recipientText));
  assert.ok(!allLogText.includes(PII.humbeeText));
  assert.ok(!allLogText.includes(PII.zipFilename));
  for (const filename of PII.attachmentFilenames) {
    assert.ok(!allLogText.includes(filename));
  }
});

test("Logs enthalten SMTP-Response-Code, Message-ID und Anhangs-Metadaten bei Erfolg", async () => {
  const { sendMail } = alwaysSucceeds();
  const logger = fakeLogger();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger });

  const acceptedLine = logger.lines.find((line) => line.includes("humbee mail delivery accepted"));
  assert.match(acceptedLine, /smtpResponseCode=250/);
  assert.match(acceptedLine, /messageId=<msg-2@/);
  assert.match(acceptedLine, /attachmentCount=2/);
  assert.match(acceptedLine, /attachmentTypes=image\/png,image\/png/);
});

test("Logs enthalten eine harmlose Fehlerkategorie bei Fehlschlag, keine Zugangsdaten", async () => {
  const sendMail = async (mail) => {
    if (mail.to === PII.humbeeTo) {
      const err = new Error("Connection timeout");
      err.name = "SMTPConnectionError";
      throw err;
    }
    return { messageId: "<rep@example.com>", response: "250 OK" };
  };
  const logger = fakeLogger();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger });

  const failedLine = logger.lines.find((line) => line.includes("humbee mail delivery failed"));
  assert.match(failedLine, /errorCategory=SMTPConnectionError/);
  assert.ok(!failedLine.includes("Connection timeout"), "die Fehlermeldung selbst darf nicht geloggt werden");
});

test("optionale runId wird in jede Log-Zeile aufgenommen", async () => {
  const { sendMail } = alwaysSucceeds();
  const logger = fakeLogger();
  await deliverRepresentativeMaterials({ ...fakeRequest(), sendMail, logger, runId: "run-123" });

  assert.ok(logger.lines.every((line) => line.includes("runId=run-123")));
});
