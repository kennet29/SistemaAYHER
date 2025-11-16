import { app as c, ipcMain as E, BrowserWindow as f } from "electron";
import t from "node:path";
import { spawn as h } from "node:child_process";
import k from "node:http";
import s from "node:fs";
let a = null, r = null, d = process.env.API_BASE_URL || "http://127.0.0.1:4000";
const u = !!process.env.VITE_DEV_SERVER_URL;
function D(o, n = 2e4) {
  const e = Date.now();
  return new Promise((b, y) => {
    const m = () => {
      const p = k.get(`${o}/health`, (i) => {
        i.statusCode && i.statusCode >= 200 && i.statusCode < 300 ? (i.resume(), b()) : (i.resume(), setTimeout(l, 500));
      });
      p.on("error", () => setTimeout(l, 500)), p.setTimeout(2e3, () => {
        p.destroy(), setTimeout(l, 500);
      });
    }, l = () => {
      if (Date.now() - e > n) {
        y(new Error("Backend did not become healthy in time"));
        return;
      }
      m();
    };
    m();
  });
}
function R() {
  if (process.platform === "win32") {
    const n = process.env.PUBLIC || "C:\\Users\\Public", e = t.join(n, "Desktop", "AYHERDB");
    try {
      s.mkdirSync(e, { recursive: !0 });
    } catch {
    }
    return t.join(e, "AYHERDB.db");
  }
  const o = t.join("/", "Users", "Shared", "AYHERDB");
  try {
    s.mkdirSync(o, { recursive: !0 });
  } catch {
  }
  return t.join(o, "AYHERDB.db");
}
async function v() {
  const o = t.resolve(process.cwd(), "../backend-ts-sqlite-jwt"), n = R();
  try {
    if (!s.existsSync(n)) {
      const e = u ? t.join(o, "dist", "ayher.db") : t.join(process.resourcesPath, "backend", "ayher.db");
      s.existsSync(e) ? s.copyFileSync(e, n) : s.writeFileSync(n, "");
    }
  } catch (e) {
    console.warn("[electron] could not prepare DB file:", e?.message);
  }
  if (u)
    r = h(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
      cwd: o,
      env: { ...process.env, PORT: "4000", DATABASE_URL: `file:${n}` },
      stdio: "inherit",
      shell: !1
    }), d = "http://127.0.0.1:4000";
  else {
    const e = t.join(process.resourcesPath, "backend", "src", "server.js");
    r = h(process.execPath, [e], {
      cwd: process.resourcesPath,
      env: { ...process.env, PORT: "4000", NODE_ENV: "production", DATABASE_URL: `file:${n}` },
      stdio: "ignore",
      detached: !0
    }), d = "http://127.0.0.1:4000";
  }
  r.on("exit", (e) => {
    console.log("[electron] backend exited with code", e);
  }), await D(d).catch((e) => {
    console.warn("[electron] backend health check failed:", e.message);
  });
}
async function w() {
  if (a = new f({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: !0,
      preload: t.join(__dirname, "preload.js")
    }
  }), u) {
    const o = process.env.VITE_DEV_SERVER_URL;
    await a.loadURL(o), a.webContents.openDevTools({ mode: "detach" });
  } else
    await a.loadFile(t.join(__dirname, "../dist-electron/index.html"));
}
c.whenReady().then(async () => {
  E.handle("ayher:get-api-base", async () => d), await v(), await w(), c.on("activate", () => {
    f.getAllWindows().length === 0 && w();
  });
});
c.on("before-quit", () => {
  try {
    r && (process.platform === "win32" ? h("taskkill", ["/pid", String(r.pid), "/f", "/t"]) : process.kill(-Number(r.pid || 0)));
  } catch {
  }
});
c.on("window-all-closed", () => {
  process.platform !== "darwin" && c.quit();
});
