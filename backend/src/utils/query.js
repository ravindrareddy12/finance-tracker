// Parse a comma-separated query-string value into a list of trimmed, non-empty items.
function parseList(value, { unique = false, upper = false } = {}) {
  let items = String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (upper)  items = items.map(s => s.toUpperCase());
  if (unique) items = [...new Set(items)];
  return items;
}

module.exports = { parseList };
