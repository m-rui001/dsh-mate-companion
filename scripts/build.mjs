/**
 * Rebuild dist/index.js from the source in this repository: the extension entry plus the MATE
 * kernel, resolved through tsconfig paths, with the host-provided modules left external — the host
 * supplies those to every extension, and they are this package's peerDependencies.
 *
 * Needs bun. `@silvia-odwyer/photon-node` is a devDependency: the image tools bundle it in.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const external = Object.keys(pkg.peerDependencies).flatMap((name) => ["--external", JSON.stringify(name)]);
const cmd = [
	"bun build",
	JSON.stringify("packages/dsh-mate-extension/src/index.ts"),
	"--outdir", JSON.stringify(join(root, "dist").replaceAll("\\", "/")),
	"--target", "node",
	"--format", "esm",
	...external,
].join(" ");

execSync(cmd, { cwd: root, stdio: "inherit", shell: true });
console.log("built dist/index.js from the source in this repository");
