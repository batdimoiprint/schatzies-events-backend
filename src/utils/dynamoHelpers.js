export function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildStringAttribute(value) {
  const normalized = normalizeString(value);
  return normalized ? { S: normalized } : undefined;
}

export function buildNumberAttribute(value) {
  return value !== undefined && value !== null && !Number.isNaN(Number(value))
    ? { N: String(value) }
    : undefined;
}
