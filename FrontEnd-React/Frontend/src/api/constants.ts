const rawApiRoot = import.meta.env.VITE_API_BASE_URL ?? '/api';
const normalizedApiRoot = rawApiRoot.endsWith('/')
  ? rawApiRoot.slice(0, -1)
  : rawApiRoot;

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!normalizedApiRoot) {
    return cleanPath;
  }
  return `${normalizedApiRoot}${cleanPath}`;
}
