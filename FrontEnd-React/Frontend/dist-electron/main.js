import { app as i, ipcMain as E, BrowserWindow as f } from "electron";
import o from "node:path";
import { spawn as u } from "node:child_process";
import k from "node:http";
import n from "node:fs";
let a = null, r = null, d = process.env.API_BASE_URL || "http://127.0.0.1:4000";
const l = !!process.env.VITE_DEV_SERVER_URL;
function P(s, t = 2e4) {
  const e = Date.now();
  return new Promise((b, y) => {
    const w = () => {
      const h = k.get(`${s}/health`, (c) => {
        c.statusCode && c.statusCode >= 200 && c.statusCode < 300 ? (c.resume(), b()) : (c.resume(), setTimeout(p, 500));
      });
      h.on("error", () => setTimeout(p, 500)), h.setTimeout(2e3, () => {
        h.destroy(), setTimeout(p, 500);
      });
    }, p = () => {
      if (Date.now() - e > t) {
        y(new Error("Backend did not become healthy in time"));
        return;
      }
      w();
    };
    w();
  });
}
function D() {
  if (process.platform === "win32") {
    const t = process.env.PUBLIC || "C:\\Users\\Public", e = o.join(t, "Desktop", "AYHERDB");
    try {
      n.mkdirSync(e, { recursive: !0 });
    } catch {
    }
    return o.join(e, "AYHERDB.db");
  }
  const s = o.join("/", "Users", "Shared", "AYHERDB");
  try {
    n.mkdirSync(s, { recursive: !0 });
  } catch {
  }
  return o.join(s, "AYHERDB.db");
}
async function R() {
  const s = o.resolve(process.cwd(), "../backend-ts-sqlite-jwt"), t = D();
  try {
    if (!n.existsSync(t)) {
      const e = l ? o.join(s, "dist", "ayher.db") : o.join(process.resourcesPath, "backend", "ayher.db");
      n.existsSync(e) ? n.copyFileSync(e, t) : n.writeFileSync(t, "");
    }
  } catch (e) {
    console.warn("[electron] could not prepare DB file:", e?.message);
  }
  if (l)
    r = u(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
      cwd: s,
      env: { ...process.env, PORT: "4000", DATABASE_URL: `file:${t}` },
      stdio: "inherit",
      shell: !1
    }), d = "http://127.0.0.1:4000";
  else {
    const e = o.join(process.resourcesPath, "backend", "src", "server.js");
    r = u(process.execPath, [e], {
      cwd: process.resourcesPath,
      env: { ...process.env, PORT: "4000", NODE_ENV: "production", DATABASE_URL: `file:${t}` },
      stdio: "ignore",
      detached: !0
    }), d = "http://127.0.0.1:4000";
  }
  r.on("exit", (e) => {
    console.log("[electron] backend exited with code", e);
  }), await P(d).catch((e) => {
    console.warn("[electron] backend health check failed:", e.message);
  });
}
async function m() {
  const s = l ? o.join(__dirname, "preload.js") : o.join(process.resourcesPath, "dist-electron", "preload.js");
  if (a = new f({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: !0,
      preload: s
    }
  }), l) {
    const t = process.env.VITE_DEV_SERVER_URL;
    await a.loadURL(t), a.webContents.openDevTools({ mode: "detach" });
  } else {
    const t = o.join(process.resourcesPath, "dist-electron", "index.html");
    await a.loadFile(t);
  }
}
i.whenReady().then(async () => {
  E.handle("ayher:get-api-base", async () => d), await R(), await m(), i.on("activate", () => {
    f.getAllWindows().length === 0 && m();
  });
});
i.on("before-quit", () => {
  try {
    r && (process.platform === "win32" ? u("taskkill", ["/pid", String(r.pid), "/f", "/t"]) : process.kill(-Number(r.pid || 0)));
  } catch {
  }
});
i.on("window-all-closed", () => {
  process.platform !== "darwin" && i.quit();
});
