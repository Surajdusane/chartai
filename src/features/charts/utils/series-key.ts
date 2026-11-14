const MAX_KEY_LENGTH = 32;

/** Lowercase, ASCII, underscore-separated, never starting with a digit. */
export const slugifyKey = (value: string) => {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_KEY_LENGTH);

  const safe = base.length > 0 ? base : "series";
  return /^[0-9]/.test(safe) ? `s_${safe}` : safe;
};

/** Returns a key that is unique within `used` (and records it). */
export const uniqueKey = (value: string, used: Set<string>) => {
  const base = slugifyKey(value);
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
};

/** Maps original column names to stable, unique series keys. */
export const toSeriesKeys = (labels: string[]) => {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const label of labels) {
    map.set(label, uniqueKey(label, used));
  }
  return map;
};
