import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const design = await readFile(new URL("DESIGN.md", root), "utf8");
const frontmatter = design.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) throw new Error("DESIGN.md must have frontmatter.");
const prefixes = {
  colors: "color",
  typography: "font",
  rounded: "radius",
  spacing: "space",
};
const tokens = [];
let group;
for (const line of frontmatter[1].split(/\r?\n/)) {
  const heading = line.match(/^([\w-]+):\s*$/);
  if (heading) {
    group = heading[1];
    continue;
  }
  if (!prefixes[group]) continue;
  const entry = line.match(/^  ([\w-]+):\s*(['"])(.*?)\2\s*$/);
  if (entry) tokens.push([`--${prefixes[group]}-${entry[1]}`, entry[3]]);
}
for (const prefix of Object.values(prefixes)) {
  if (!tokens.some(([name]) => name.startsWith(`--${prefix}-`)))
    throw new Error(`Missing concrete ${prefix} tokens.`);
}
const css = `/* Generated from DESIGN.md. Run npm run tokens; do not hand-edit. */\n:root {\n${tokens.map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}\n`;
const target = new URL("src/styles/tokens.css", root);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== css)
    throw new Error("Runtime token drift. Run npm run tokens.");
  const styles = await readFile(new URL("src/styles/index.css", root), "utf8");
  const defined = new Set([
    ...tokens.map(([name]) => name),
    ...[...styles.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
  ]);
  // Per-instance chart values are assigned by React rather than global design tokens.
  for (const file of await readdir(new URL("src/", root), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!file.isFile() || !/\.jsx?$/.test(file.name)) continue;
    const source = await readFile(`${file.parentPath}/${file.name}`, "utf8");
    for (const [, name] of source.matchAll(/['"](--[\w-]+)['"]\s*:/g))
      defined.add(name);
  }
  for (const [, name] of styles.matchAll(/var\((--[\w-]+)/g))
    if (!defined.has(name)) throw new Error(`Undefined token: ${name}`);
  console.log(
    `Design lint and token drift: ${tokens.length} concrete tokens verified.`,
  );
} else {
  await mkdir(fileURLToPath(new URL("src/styles/", root)), { recursive: true });
  await writeFile(target, css);
  console.log(`Generated ${tokens.length} runtime tokens.`);
}
