/**
 * Prüft die Zugangsdaten für den internen Materialgenerator gegen
 * Umgebungsvariablen (`MATERIAL_ADMIN_USERNAME`, `MATERIAL_ADMIN_PASSWORD`).
 * Genau ein Administrator-Konto, keine Benutzerverwaltung, keine
 * Datenbank, kein Token — bei Erfolg meldet dieser Endpunkt lediglich
 * `{ ok: true }` zurück; die Anmeldung selbst hält der Client in
 * `sessionStorage` fest (siehe `core/auth/authSession.js`).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { username, password } = req.body || {};

  const expectedUsername = process.env.MATERIAL_ADMIN_USERNAME;
  const expectedPassword = process.env.MATERIAL_ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.error("[login] MATERIAL_ADMIN_USERNAME/MATERIAL_ADMIN_PASSWORD ist nicht konfiguriert.");
    res.status(500).json({ ok: false, error: "Login ist derzeit nicht verfügbar." });
    return;
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username !== expectedUsername ||
    password !== expectedPassword
  ) {
    res.status(401).json({ ok: false, error: "Benutzername oder Passwort ist falsch." });
    return;
  }

  res.status(200).json({ ok: true });
}
