import fs from "fs";
import path from "path";

const locateProjectRoot = (): string => {
  let dir = __dirname;
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return dir;
    }
    dir = parent;
  }
};

const projectRoot = locateProjectRoot();
const repoRoot = path.dirname(projectRoot);
const localFallbackLogo = path.resolve(__dirname, "..", "img", "logo.png");

const createFallbackPaths = (): string[] => [
  localFallbackLogo,
  path.join(projectRoot, "src", "img", "logo.png"),
  path.join(projectRoot, "dist", "src", "img", "logo.png"),
  path.join(repoRoot, "FrontEnd-React", "Frontend", "src", "img", "logo.png"),
  path.join(repoRoot, "FrontEnd-React", "Frontend", "public", "img", "logo.png"),
];

export const resolveLogoPath = (declared?: string | null): string | null => {
  const candidates = [declared, ...createFallbackPaths()];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
};
