import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "server"), { recursive: true });
await mkdir(join(dist, "client"), { recursive: true });
await mkdir(join(dist, ".openai"), { recursive: true });

await cp(join(root, "worker", "index.js"), join(dist, "server", "index.js"));
await cp(join(root, "dashboard"), join(dist, "client"), { recursive: true });
await cp(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));
