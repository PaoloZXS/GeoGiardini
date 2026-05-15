import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }

  return createClient({
    url: databaseUrl,
    authToken,
  });
}

function normalizeColumnName(raw: unknown) {
  return (raw ?? '').toString().trim().toLowerCase();
}

function extractTableColumns(rows: any[] | undefined) {
  if (!Array.isArray(rows)) return [] as string[];

  const found = new Set<string>();
  for (const row of rows) {
    const nameFromObject = row?.name ?? row?.column_name ?? row?.column;
    if (nameFromObject != null) {
      found.add(normalizeColumnName(nameFromObject));
      continue;
    }
    if (Array.isArray(row) && row.length > 1) {
      found.add(normalizeColumnName(row[1]));
      continue;
    }
    const values = Object.values(row ?? {});
    if (values.length > 1) {
      found.add(normalizeColumnName(values[1]));
    }
  }

  return Array.from(found).filter(Boolean);
}

async function safeAddColumn(db: ReturnType<typeof createDbClient>, sql: string) {
  try {
    await db.execute(sql, []);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('duplicate column name') || message.includes('already exists')) {
      return;
    }
    throw error;
  }
}

export async function ensureGiardinieriTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS giardinieri (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL, attivo INTEGER NOT NULL DEFAULT 0)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('giardinieri')", []);
  const columns = extractTableColumns(columnsResult.rows);

  if (!columns.includes('attivo')) {
    await safeAddColumn(db, 'ALTER TABLE giardinieri ADD COLUMN attivo INTEGER NOT NULL DEFAULT 0');
  }
}

export async function ensureClientiTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT, codice TEXT NOT NULL DEFAULT "", attivo INTEGER NOT NULL DEFAULT 1)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('clienti')", []);
  const columns = extractTableColumns(columnsResult.rows);

  if (!columns.includes('codice')) {
    await safeAddColumn(db, 'ALTER TABLE clienti ADD COLUMN codice TEXT NOT NULL DEFAULT ""');
  }

  if (!columns.includes('attivo')) {
    await safeAddColumn(db, 'ALTER TABLE clienti ADD COLUMN attivo INTEGER NOT NULL DEFAULT 1');
  }
}

export async function ensureAttivitaTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS attivita (id TEXT PRIMARY KEY, description TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('attivita')", []);
  const columns = extractTableColumns(columnsResult.rows);

  if (!columns.includes('description')) {
    await safeAddColumn(db, 'ALTER TABLE attivita ADD COLUMN description TEXT NOT NULL DEFAULT ""');
  }
  if (!columns.includes('completed')) {
    await safeAddColumn(db, 'ALTER TABLE attivita ADD COLUMN completed INTEGER NOT NULL DEFAULT 0');
  }
}

export function extractCount(result: any) {
  const row = result.rows?.[0];
  if (!row) return 0;
  if (Array.isArray(row)) {
    return Number(row[0] ?? 0);
  }
  if (typeof row === 'object') {
    const firstValue = Object.values(row)[0];
    return Number(firstValue ?? 0);
  }
  return 0;
}
