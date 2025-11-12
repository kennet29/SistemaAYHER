declare global {
  interface Window {
    ayher?: {
      getApiBase?: () => Promise<string>;
    };
  }
}

let cachedBase: string | null = null;

export async function resolveApiBase(): Promise<string> {
  if (cachedBase) return cachedBase;
  try {
    if (window?.ayher?.getApiBase) {
      const v = await window.ayher.getApiBase();
      if (v) {
        cachedBase = v;
        return v;
      }
    }
  } catch {}
  cachedBase = 'http://127.0.0.1:4000';
  return cachedBase;
}

export function getApiBaseSync(): string {
  // Best-effort sync fallback for code that needs a constant
  return cachedBase || 'http://127.0.0.1:4000';
}

