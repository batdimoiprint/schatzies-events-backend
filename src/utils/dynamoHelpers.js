export function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildStringAttribute(value) {
  const normalized = normalizeString(value);
  return normalized ? { S: normalized } : undefined;
}

export function buildJsonAttribute(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  try {
    return { S: JSON.stringify(value) };
  } catch {
    return undefined;
  }
}

export function buildJsonOrStringAttribute(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'object') {
    return buildJsonAttribute(value);
  }

  return buildStringAttribute(String(value));
}

export function buildNumberAttribute(value) {
  return value !== undefined && value !== null && !Number.isNaN(Number(value))
    ? { N: String(value) }
    : undefined;
}
