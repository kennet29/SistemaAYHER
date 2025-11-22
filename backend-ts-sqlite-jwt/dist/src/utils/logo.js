"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLogoPath = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const locateProjectRoot = () => {
    let dir = __dirname;
    while (true) {
        if (fs_1.default.existsSync(path_1.default.join(dir, "package.json"))) {
            return dir;
        }
        const parent = path_1.default.dirname(dir);
        if (parent === dir) {
            return dir;
        }
        dir = parent;
    }
};
const projectRoot = locateProjectRoot();
const repoRoot = path_1.default.dirname(projectRoot);
const localFallbackLogo = path_1.default.resolve(__dirname, "..", "img", "logo.png");
const createFallbackPaths = () => [
    localFallbackLogo,
    path_1.default.join(projectRoot, "src", "img", "logo.png"),
    path_1.default.join(projectRoot, "dist", "src", "img", "logo.png"),
    path_1.default.join(repoRoot, "FrontEnd-React", "Frontend", "src", "img", "logo.png"),
    path_1.default.join(repoRoot, "FrontEnd-React", "Frontend", "public", "img", "logo.png"),
];
const resolveLogoPath = (declared) => {
    const candidates = [declared, ...createFallbackPaths()];
    for (const candidate of candidates) {
        if (!candidate)
            continue;
        try {
            if (fs_1.default.existsSync(candidate))
                return candidate;
        }
        catch {
            // ignore
        }
    }
    return null;
};
exports.resolveLogoPath = resolveLogoPath;
