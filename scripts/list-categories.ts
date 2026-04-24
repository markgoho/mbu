import { Glob } from "bun";
import { join } from "node:path";

type BadgeData = {
  category?: string;
};

const contentDir = join(import.meta.dir, "../hugo/data/merit-badges");
const files = Array.from(new Glob("*.json").scanSync(contentDir));
const categoryCounts = new Map<string, number>();
const missingCategories: string[] = [];

for (const file of files) {
  const filePath = join(contentDir, file);
  const data = (await Bun.file(filePath).json()) as BadgeData;
  const category = data["category"]?.trim();

  if (category === undefined || category === "") {
    missingCategories.push(file.replace(/\.json$/, ""));
    continue;
  }

  categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
}

for (const [category, count] of [...categoryCounts.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  console.log(`${category}: ${count}`);
}

if (missingCategories.length > 0) {
  console.error("\nMissing category in:");
  for (const badge of missingCategories.sort((a, b) => a.localeCompare(b))) {
    console.error(`- ${badge}`);
  }
  process.exitCode = 1;
}
