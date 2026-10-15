import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const commands = [["scripts/design-tokens.mjs", "--check"]];
for (const dir of ["src", "scripts"]) {
  for (const item of await readdir(`${root}/${dir}`, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (item.isFile() && /\.(?:js|mjs)$/.test(item.name))
      commands.push(["--check", `${item.parentPath}/${item.name}`]);
  }
}
for (const command of commands) {
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
const html = await readFile(`${root}/index.html`, "utf8");
const page = await readFile(`${root}/src/components/landing/Hero.jsx`, "utf8");
if ((page.match(/<h1\b/g) || []).length !== 1)
  throw new Error("Landing page needs one h1.");
for (const asset of [...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map(
  (m) => m[1],
))
  await readFile(
    asset.startsWith("/src/") ? `${root}${asset}` : `${root}/public${asset}`,
  );
console.log("JavaScript syntax, page landmarks, and local assets checked.");
