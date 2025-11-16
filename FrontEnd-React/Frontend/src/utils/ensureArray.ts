export function ensureArray<T = any>(payload: any): T[] {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  return (raw as T[]).filter((item) => item !== null && item !== undefined);
}

