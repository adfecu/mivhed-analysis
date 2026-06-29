import { copyFileSync, mkdirSync, rmSync } from "node:fs";

const files = [
  "data.js",
  "last-four-years.css",
  "last-four-years.html",
  "last-four-years.js",
  "styles.css",
];

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

for (const file of files) {
  copyFileSync(file, `dist/${file}`);
}

copyFileSync("last-four-years.html", "dist/index.html");
