import { spawnSync } from "node:child_process";

const steps = [
  ["node", ["tools/validate-schemas.mjs"]],
  ["node", ["tools/verify-hashes.mjs"]],
  ["node", ["tools/verify-signatures.mjs"]],
  ["node", ["tools/verify-state.mjs"]],
  ["node", ["tools/build-index.mjs"]]
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
