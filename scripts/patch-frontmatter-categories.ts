import { MERIT_BADGES } from "./merit-badges";

function buildCategoryFrontmatter({ category }: { category: string }): string {
  return `categories: ["${category}"]`;
}

for (const badge of MERIT_BADGES) {
  const contentPath = `hugo/content/merit-badges/${badge.slug}/_index.md`;
  const file = Bun.file(contentPath);

  if (!(await file.exists())) {
    console.log(`⚠️  Skipping ${badge.title} — no _index.md found`);
    continue;
  }

  const content = await file.text();
  const categoryLine = buildCategoryFrontmatter({
    category: badge.category,
  });

  if (!content.startsWith("---\n")) {
    console.log(`⚠️  Skipping ${badge.title} — no front matter found`);
    continue;
  }

  const frontmatterEndIndex = content.indexOf("\n---\n", 4);
  if (frontmatterEndIndex === -1) {
    console.log(`⚠️  Skipping ${badge.title} — malformed front matter`);
    continue;
  }

  const frontmatter = content.slice(4, frontmatterEndIndex);
  const body = content.slice(frontmatterEndIndex + 5);
  const frontmatterLines = frontmatter.split("\n").filter(Boolean);
  const filteredLines = frontmatterLines.filter(
    line => !line.startsWith("categories:") && !line.startsWith("category_id:"),
  );
  const updatedFrontmatterLines = [...filteredLines, categoryLine];
  const updatedContent = `---\n${updatedFrontmatterLines.join("\n")}\n---\n${body}`;

  await Bun.write(contentPath, updatedContent);
  console.log(`✅ ${badge.title} → front matter categories updated`);
}

console.log("\n✨ Front matter category patch complete!");
