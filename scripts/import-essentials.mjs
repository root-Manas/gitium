import { mkdir, writeFile } from "node:fs/promises";
const source =
  "https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md";
const response = await fetch(source);
if (!response.ok) throw new Error("Catalog source unavailable");
const markdown = await response.text();
let category = "Other";
const projects = new Map();
for (const line of markdown.split("\n")) {
  if (line.startsWith("### ")) {
    category = line
      .slice(4)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
    continue;
  }
  const entry = line.match(
    /^- \[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*(?:`[^`]+`\s*)?-\s*(.*)$/,
  );
  if (!entry) continue;
  const links = [
    ...line.matchAll(/https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/g),
  ].map((match) => match[1].replace(/\.git$/, ""));
  const preferred = line.match(
    /\[Source Code\]\(https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\)/,
  )?.[1];
  const repo = preferred || links[0];
  if (!repo || projects.has(repo.toLowerCase())) continue;
  const description = entry[3]
    .split(/\s\((?:\[Demo\]|\[Source Code\]|\[Clients\])/)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`[^`]*`/g, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (description.length < 12) continue;
  projects.set(repo.toLowerCase(), {
    repo,
    name: entry[1],
    category,
    description: description.slice(0, 350),
    source: "awesome-selfhosted",
  });
}
if (projects.size < 501)
  throw new Error(`Expected over 500 projects, got ${projects.size}`);
const catalog = {
  updated: new Date().toISOString().slice(0, 10),
  source: "https://github.com/awesome-selfhosted/awesome-selfhosted",
  license: "CC-BY-SA-3.0",
  projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name)),
};
await mkdir("public/catalog", { recursive: true });
await writeFile("public/catalog/essentials.json", JSON.stringify(catalog));
const license = await fetch(
  "https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/LICENSE",
);
if (!license.ok) throw new Error("License unavailable");
await writeFile("public/catalog/LICENSE.txt", await license.text());
console.log(
  JSON.stringify({
    projects: projects.size,
    categories: new Set(catalog.projects.map((item) => item.category)).size,
    bytes: JSON.stringify(catalog).length,
  }),
);
