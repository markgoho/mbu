---
name: merit-badge-requirements
description: Read Scouting America merit badge requirements and Digital Resource Guides from merit-badge.university as plain Markdown. Use it when a user asks what a merit badge requires, which badges are Eagle-required, how to complete or explain a specific requirement, or for study help on a merit badge.
---

# Merit badge requirements

Merit Badge University (https://merit-badge.university/) explains every Scouting America merit badge. It has the official requirements, synced from scouting.org, and a Digital Resource Guide (DRG) for each badge. Each page has a Markdown version. Read the Markdown version, not the HTML page.

## Steps

1. Get the index: https://merit-badge.university/llms.txt. It lists each badge with a link to its requirements and marks the Eagle-required badges.
2. Find the badge slug: the badge name in lowercase, with hyphens between words. Examples: `camping`, `first-aid`, `citizenship-in-the-community`.
3. Get the Markdown page you need:
   - Badge overview (Eagle-required, category, pamphlet, last sync date): `https://merit-badge.university/merit-badges/<slug>/index.md`
   - Official requirements: `https://merit-badge.university/merit-badges/<slug>/requirements/index.md`
   - Digital Resource Guide introduction: `https://merit-badge.university/merit-badges/<slug>/guide/index.md`
   - Guide page for one requirement: `https://merit-badge.university/merit-badges/<slug>/guide/req<id>/index.md`. The `<id>` is the requirement number and letter with no separator. Example: requirement 1a of Camping is https://merit-badge.university/merit-badges/camping/guide/req1a/index.md
   - Extended learning: `https://merit-badge.university/merit-badges/<slug>/guide/extended-learning/index.md`
4. For questions across many badges, get https://merit-badge.university/llms-full.txt. It has the facts and the full requirements of all badges in one file.

## Rules

- The requirements come from scouting.org. Each overview page gives the last sync date and a link to the official page. For an official answer, send the user to that link.
- Some requirements share one guide page, so not every requirement ID has its own URL. If a guide URL gives 404, open the guide introduction or the requirements page.
- A Scout earns a merit badge with a registered merit badge counselor. Do not say that reading these pages completes a requirement.
