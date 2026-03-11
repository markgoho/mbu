import { readdir } from "node:fs/promises";
import { join } from "node:path";

const SCHEMA_URL = "../../static/schemas/merit-badge.schema.json";
const BADGE_DATA_DIRECTORY = join(
  import.meta.dir,
  "..",
  "hugo",
  "data",
  "merit-badges",
);

type JsonValue =
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type BadgeJson = {
  $schema?: string;
} & { [key: string]: JsonValue };

async function addSchemaProperty(): Promise<void> {
  const directoryEntries = await readdir(BADGE_DATA_DIRECTORY, {
    withFileTypes: true,
  });
  const filePaths = directoryEntries
    .filter(directoryEntry => directoryEntry.isFile())
    .filter(directoryEntry => directoryEntry.name.endsWith(".json"))
    .map(directoryEntry => join(BADGE_DATA_DIRECTORY, directoryEntry.name));

  if (filePaths.length === 0) {
    throw new Error(`No merit badge JSON files found in ${BADGE_DATA_DIRECTORY}`);
  }

  filePaths.sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));

  let updatedCount = 0;
  let alreadyCorrectCount = 0;

  for (const filePath of filePaths) {
    const badgeFile = Bun.file(filePath);
    const parsedBadgeData = (await badgeFile.json()) as BadgeJson;

    const { $schema: existingSchema, ...restOfBadgeData } = parsedBadgeData;
    const updatedBadgeData: BadgeJson = {
      $schema: SCHEMA_URL,
      ...restOfBadgeData,
    };

    const originalJson = await badgeFile.text();
    const updatedJson = `${JSON.stringify(updatedBadgeData, null, 2)}\n`;

    if (originalJson === updatedJson && existingSchema === SCHEMA_URL) {
      alreadyCorrectCount += 1;
      continue;
    }

    await Bun.write(filePath, updatedJson);
    updatedCount += 1;
  }

  console.log(`Updated ${updatedCount} merit badge files.`);
  console.log(`Already correct ${alreadyCorrectCount} merit badge files.`);
}

await addSchemaProperty();
