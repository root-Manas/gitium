import { mkdir, copyFile } from "node:fs/promises";
const source = "node_modules/@matrix-org/matrix-sdk-crypto-wasm/";
const target = "public/e2ee/vendor/";
await mkdir(target + "pkg", { recursive: true });
for (const name of [
  "index.mjs",
  "LICENSE",
  "pkg/matrix_sdk_crypto_wasm_bg.js",
  "pkg/matrix_sdk_crypto_wasm_bg.wasm",
])
  await copyFile(source + name, target + name);
