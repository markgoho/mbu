import * as cheerio from "cheerio";
import { Impit } from "impit";

const client = new Impit({ browser: "chrome", timeout: 30000 });
const res = await client.fetch("https://www.scouting.org/merit-badges/animal-science/");
const html = await res.text();
const $ = cheerio.load(html);

// Find Beef Cattle Option (ID 12402) and its (a) child
const beefCattleChildren = $(`.mb-requirement-child.mb-parent-12402`);

console.log("=== BEEF CATTLE OPTION CHILDREN ===");
console.log("Found:", beefCattleChildren.length, "children\n");

beefCattleChildren.each((i, child) => {
  const $child = $(child);
  const text = $child.text().trim();

  if (text.startsWith("(a)")) {
    console.log("=== REQUIREMENT (a) FULL HTML ===\n");
    console.log($child.html());
    console.log("\n\n=== REQUIREMENT (a) STRUCTURE ===");
    console.log("Classes:", $child.attr("class"));

    const childId = $child.attr("class")?.match(/mb-requirement-id-(\d+)/)?.[1];
    console.log("ID:", childId);

    // Check for lists inside
    const lists = $child.find("ul, ol");
    console.log("\nLists found:", lists.length);

    lists.each((j, list) => {
      console.log(`\nList ${j}:`);
      console.log("Type:", list.tagName);
      console.log("Items:");
      $(list).find("li").each((k, li) => {
        console.log(`  ${k + 1}. ${$(li).text().trim().substring(0, 80)}`);
      });
    });

    // Check if there are nested requirement-child elements
    if (childId) {
      const nested = $(`.mb-requirement-child.mb-parent-${childId}`);
      console.log("\nNested children found:", nested.length);
      nested.each((n, nel) => {
        console.log(`  Nested ${n}:`, $(nel).text().trim().substring(0, 80));
      });
    }
  }
});
