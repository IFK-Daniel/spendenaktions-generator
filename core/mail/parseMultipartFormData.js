import Busboy from "busboy";

/**
 * Liest einen `multipart/form-data`-Request-Body vollständig ein und
 * liefert die Textfelder (`fields`, z. B. `metadata`) sowie alle
 * Dateiteile (`files`, jeweils mit erhaltenem Dateinamen und MIME-Typ)
 * als `Buffer`. Ausgelagert aus `api/send-representative-mail.js` in
 * ein eigenständiges, DOM-freies Core-Modul, damit das Multipart-
 * Parsing — die eigentliche neue Logik der Umstellung von Base64/JSON
 * auf `multipart/form-data`, siehe `core/mail/sendRepresentativeMaterials.js`
 * — ohne echten HTTP-Server/echte Vercel-Function testbar ist (die
 * dünne API-Datei selbst bleibt bewusst ungetestet, analog zu den
 * übrigen `api/*.js`-Dateien in diesem Projekt).
 *
 * Reines Node-Modul (verwendet `busboy`, das auf einem lesbaren
 * Node-Stream mit `.headers` operiert) — läuft ausschließlich
 * serverseitig, nicht im Browser.
 *
 * @param {{ headers: Record<string, string>, pipe: Function }} req
 *   Ein lesbarer Node-Stream mit `headers` (mindestens `content-type`
 *   mit Multipart-Boundary) — im Produktivbetrieb das echte
 *   `http.IncomingMessage`, in Tests z. B. ein `PassThrough`-Stream
 *   mit angehängtem `headers`-Objekt.
 * @returns {Promise<{
 *   fields: Record<string, string>,
 *   files: Array<{ field: string, filename: string, mimeType: string, content: Buffer }>
 * }>}
 * @throws {Error} Bei fehlerhaftem Multipart-Body (z. B. fehlende/
 *   ungültige Boundary) oder einem Lesefehler eines Dateiteils.
 */
export function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({ headers: req.headers });
    } catch (err) {
      reject(err);
      return;
    }

    const fields = {};
    const files = [];
    const filePromises = [];

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (fieldName, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      filePromises.push(
        new Promise((resolveFile, rejectFile) => {
          stream.on("end", () => {
            files.push({ field: fieldName, filename: info.filename, mimeType: info.mimeType, content: Buffer.concat(chunks) });
            resolveFile();
          });
          stream.on("error", rejectFile);
        })
      );
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      Promise.all(filePromises)
        .then(() => resolve({ fields, files }))
        .catch(reject);
    });

    req.pipe(busboy);
  });
}
