const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const srcLogo = path.join(rootDir, "src", "img", "logo.png");
const distLogo = path.join(rootDir, "dist", "src", "img", "logo.png");

try {
  if (!fs.existsSync(srcLogo)) {
    console.error(`[copy-logo] No logo found at ${srcLogo}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(distLogo), { recursive: true });
  fs.copyFileSync(srcLogo, distLogo);
  console.log(`[copy-logo] Copied ${srcLogo} to ${distLogo}`);
} catch (error) {
  console.error("[copy-logo] Failed to copy logo:", error);
  process.exit(1);
}
