import { MERIT_BADGES } from "./merit-badges";

for (const badge of MERIT_BADGES) {
  const dataPath = `hugo/data/merit-badges/${badge.slug}.json`;
  const file = Bun.file(dataPath);

  if (!(await file.exists())) {
    console.log(`⚠️  Skipping ${badge.title} — no data.json found`);
    continue;
  }

  const data = await file.json();
  data.category = badge.category;
  delete data.category_id;

  await Bun.write(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`✅ ${badge.title} → ${badge.category}`);
}

console.log("\n✨ Category patch complete!");
