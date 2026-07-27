#!/usr/bin/env node
// Scans recipes/*.json and writes recipes/index.json with the fields
// needed for the overview/filter list (no dependencies, plain Node.js).

import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recipesDir = path.join(__dirname, "..", "recipes");
const indexFile = path.join(recipesDir, "index.json");

async function main() {
  const files = (await readdir(recipesDir)).filter(
    (f) => f.endsWith(".json") && f !== "index.json"
  );

  const entries = [];
  for (const file of files) {
    const raw = await readFile(path.join(recipesDir, file), "utf8");
    let recipe;
    try {
      recipe = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Ungültiges JSON in recipes/${file}: ${err.message}`);
    }

    const id = recipe.id || path.basename(file, ".json");
    if (!recipe.title) {
      throw new Error(`recipes/${file} hat kein "title"-Feld`);
    }

    entries.push({
      id,
      title: recipe.title,
      category: recipe.category || "sonstiges",
      cuisine: recipe.cuisine || "",
      time: recipe.time || null,
      servings: recipe.servings || null,
      image: recipe.image || null,
    });
  }

  entries.sort((a, b) => a.title.localeCompare(b.title, "de"));

  await writeFile(indexFile, JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log(`recipes/index.json geschrieben (${entries.length} Rezepte)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
