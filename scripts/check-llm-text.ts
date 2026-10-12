/**
 * Checks the plain-text outputs for LLMs (mbu#328, mbu#331): every
 * generated `.md` twin, `llms.txt`, `llms-full.txt` and `robots.txt`
 * must contain no HTML tag and no Hugo template syntax (`{{`).
 *
 * Usage: bun scripts/check-llm-text.ts [publicDir]   (default: hugo/public)
 * Exits 1 on any hit.
 */
import { Glob } from "bun";
import { join } from "node:path";

const publicDir = process.argv[2] ?? "hugo/public";
const ROOT_FILES = ["llms.txt", "llms-full.txt", "robots.txt"];
const CHECKS = [
  { name: "HTML tag", pattern: /<[A-Za-z/!]/ },
  { name: "template syntax", pattern: /\{\{/ },
];

const files = [...new Glob("**/*.md").scanSync(publicDir), ...ROOT_FILES];
const hits: string[] = [];

for (const file of files) {
  const lines = (await Bun.file(join(publicDir, file)).text()).split("\n");
  lines.forEach((line, i) => {
    for (const { name, pattern } of CHECKS) {
      if (pattern.test(line)) hits.push(`${file}:${i + 1}: ${name}: ${line.trim().slice(0, 120)}`);
    }
  });
}

if (hits.length > 0) {
  console.error(hits.join("\n"));
  console.error(`\n${hits.length} problem(s) in ${files.length} file(s).`);
  process.exit(1);
}
console.log(`OK: ${files.length} plain-text file(s), no HTML tags and no "{{".`);
