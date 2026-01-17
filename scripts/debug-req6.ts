import * as cheerio from "cheerio";
import { Impit } from "impit";

const client = new Impit({ browser: "chrome", timeout: 30000 });
const res = await client.fetch(
  "https://www.scouting.org/merit-badges/animal-science/",
);
const html = await res.text();
const $ = cheerio.load(html);

console.log("=== SEARCHING FOR REQUIREMENT 6 ===\n");

// Find requirement 6 specifically
let found = false;
$(".mb-requirement-parent").each((idx, el) => {
  const $el = $(el);
  const num = $el.find(".mb-requirement-listnumber").text().trim();

  if (num === "6." || num === "6") {
    console.log("=== REQUIREMENT 6 FOUND ===");
    console.log("Full HTML:");
    console.log($el.html());
    console.log("\n=== CLASSES ===");
    console.log($el.attr("class"));

    console.log("\n=== TEXT CONTENT ===");
    console.log($el.text().trim());

    console.log("\n=== CHECKING FOR CHILDREN ===");
    const parentId = $el.attr("class")?.match(/mb-requirement-id-(\d+)/)?.[1];
    console.log("Parent ID:", parentId);

    if (parentId) {
      const children = $(`.mb-requirement-child.mb-parent-${parentId}`);
      console.log(
        "Found children with .mb-parent-" + parentId + ":",
        children.length,
      );

      children.each((i, child) => {
        console.log("\n=== Child " + i + " (Top-level option) ===");
        const $child = $(child);
        console.log("Classes:", $child.attr("class"));
        console.log(
          "Text (first 100 chars):",
          $child.text().trim().substring(0, 100),
        );

        // Check if THIS child has an ID we can use to find its children
        const childId = $child
          .attr("class")
          ?.match(/mb-requirement-id-(\d+)/)?.[1];
        console.log("Child ID:", childId);

        if (childId) {
          // Look for nested children of this option
          const nestedChildren = $(
            `.mb-requirement-child.mb-parent-${childId}`,
          );
          console.log("Found nested children:", nestedChildren.length);

          nestedChildren.each((j, nested) => {
            const nestedText = $(nested).text().trim();
            console.log(`  Nested child ${j}:`, nestedText.substring(0, 100));
          });
        }
      });
    }

    console.log("\n=== CHECKING FOR INLINE LISTS ===");
    const lists = $el.find("ul, ol");
    console.log("Found lists:", lists.length);
    lists.each((i, list) => {
      console.log("\nList " + i + ":");
      $(list)
        .find("li")
        .each((j, li) => {
          console.log(
            "  Item " + j + ":",
            $(li).text().trim().substring(0, 100),
          );
        });
    });

    found = true;
  }
});

if (!found) {
  console.log("ERROR: Requirement 6 not found!");
  console.log("\nAll requirements found:");
  $(".mb-requirement-parent").each((idx, el) => {
    const num = $(el).find(".mb-requirement-listnumber").text().trim();
    console.log("  - " + num);
  });
}
