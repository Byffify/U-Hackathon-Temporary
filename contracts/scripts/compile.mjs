import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = await readFile(new URL("../src/UTopiaMarketplace.sol", import.meta.url), "utf8");
const input = {
  language: "Solidity",
  sources: { "UTopiaMarketplace.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "shanghai",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode", "metadata"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), {
  import: (name) => {
    try { return { contents: readFileSync(path.join(root, "node_modules", name), "utf8") }; }
    catch { return { error: `Missing import: ${name}` }; }
  },
}));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
const contract = output.contracts["UTopiaMarketplace.sol"].UTopiaMarketplace;
const outDir = path.join(root, "artifacts");
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "UTopiaMarketplace.json"), JSON.stringify({
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
  compilerVersion: solc.version(),
  evmVersion: "shanghai",
}, null, 2));
console.log(`Compiled UTopiaMarketplace with ${solc.version()} for Shanghai EVM.`);
