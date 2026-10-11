// Thin helpers over the Cloudflare D1 binding.
//
// Datetimes are stored as UTC ISO-8601 text. Date parameters are written in
// that same format, and `*_at` / date columns come back as Date objects, so the
// route code works with Dates just as it did with mysql2.
let db;

export function bindDb(binding) {
  db = binding;
}

/** SQL for "now" in the stored datetime format, optionally shifted ("-3 days"). */
export const now = (modifier) =>
  modifier ? `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '${modifier}')` : "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
export const NOW = now();

/** MySQL's FIELD(): position of `column` in `values`, for ORDER BY. */
export const fieldOrder = (column, values) =>
  `CASE ${column} ${values.map((v, i) => `WHEN '${v}' THEN ${i + 1}`).join(" ")} ELSE 0 END`;

/** "First Last", falling back to the username, for an auth_user alias. */
export const userNameSql = (alias) =>
  `COALESCE(NULLIF(TRIM(${alias}.first_name || ' ' || ${alias}.last_name), ''), ${alias}.username)`;

const DATE_COLUMN = /(_at|^last_login|^date_joined|^first)$/;

function toParam(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function fromRow(row) {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string") continue;
    if (DATE_COLUMN.test(key)) row[key] = new Date(value);
    else if (key === "meta") row[key] = JSON.parse(value);
  }
  return row;
}

export function prepare(sql, params = []) {
  return db.prepare(sql).bind(...params.map(toParam));
}

/** SELECT → rows. Anything else → { insertId, affectedRows }. */
export async function query(sql, params = []) {
  const statement = prepare(sql, params);
  if (/^\s*(SELECT|WITH)\b/i.test(sql)) {
    const { results } = await statement.all();
    return results.map(fromRow);
  }
  const { meta } = await statement.run();
  return { insertId: meta.last_row_id, affectedRows: meta.changes };
}

/** Runs prepared statements in one round trip (and one implicit transaction). */
export async function batch(statements) {
  if (statements.length) await db.batch(statements);
}

// D1 allows at most 100 bound parameters per statement.
export const MAX_PARAMS = 100;

export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
