export function slugify(text) {
  const umlautMap = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };
  const replaced = text.replace(/[äöüÄÖÜß]/g, (ch) => umlautMap[ch]);
  return replaced
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
