import { mkdir, copyFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist", "polished-markdown");
const deliverables = path.join(root, "outputs");
await rm(path.join(root, "dist"), { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(deliverables, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css", "versions.json", "README.md", "LICENSE", "CHANGELOG.md"]) {
  await copyFile(path.join(root, file), path.join(output, file));
}
const archive = "polished-markdown-1.0.0.zip";
execFileSync("zip", ["-r", archive, "polished-markdown"], {
  cwd: path.join(root, "dist"),
  stdio: "inherit"
});
await copyFile(path.join(root, "dist", archive), path.join(deliverables, archive));
