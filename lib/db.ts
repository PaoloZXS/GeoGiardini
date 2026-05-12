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

export async function ensureGiardinieriTable(db: ReturnType<typeof createDbClient>) {
  const existingTablesResult = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('giardinieri', 'giardinieri_fix')",
    []
  );
  const existingTables = Array.isArray(existingTablesResult.rows)
    ? existingTablesResult.rows.map((row: any) =>
        row?.name?.toString() ?? row?.[0]?.toString() ?? Object.values(row)[0]?.toString()
      )
    : [];

  const hasGiardinieri = existingTables.includes('giardinieri');
  const hasFix = existingTables.includes('giardinieri_fix');

  if (!hasGiardinieri) {
    await db.execute(
      'CREATE TABLE giardinieri (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL, attivo INTEGER NOT NULL DEFAULT 0)',
      []
    );
    if (hasFix) {
      await db.execute(
        'INSERT OR IGNORE INTO giardinieri (id, username, codice, created_at, attivo) SELECT CAST(id AS TEXT), CAST(username AS TEXT), CAST(codice AS TEXT), CAST(created_at AS TEXT), CAST(attivo AS INTEGER) FROM giardinieri_fix',
        []
      );
      await db.execute('DROP TABLE IF EXISTS giardinieri_fix', []);
    }
    return;
  }

  if (hasFix) {
    const tempTable = 'giardinieri_migration';
    await db.execute(
      `CREATE TABLE IF NOT EXISTS ${tempTable} (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL, attivo INTEGER NOT NULL DEFAULT 0)`,
      []
    );
    await db.execute(
      `INSERT OR IGNORE INTO ${tempTable} (id, username, codice, created_at, attivo) SELECT CAST(id AS TEXT), CAST(username AS TEXT), CAST(codice AS TEXT), CAST(created_at AS TEXT), CAST(attivo AS INTEGER) FROM giardinieri_fix`,
      []
    );
    await db.execute(
      `INSERT OR IGNORE INTO ${tempTable} (id, username, codice, created_at, attivo) SELECT CAST(id AS TEXT), CAST(username AS TEXT), CAST(codice AS TEXT), CAST(created_at AS TEXT), CAST(attivo AS INTEGER) FROM giardinieri`,
      []
    );
    await db.execute('DROP TABLE IF EXISTS giardinieri_fix', []);
    await db.execute('DROP TABLE IF EXISTS giardinieri', []);
    await db.execute(`ALTER TABLE ${tempTable} RENAME TO giardinieri`, []);
  }

  const columnsResult = await db.execute("PRAGMA table_info('giardinieri')", []);
  const columns = Array.isArray(columnsResult.rows)
    ? columnsResult.rows.map((row: any) => row?.name?.toString() ?? row?.[1]?.toString() ?? Object.values(row)[1]?.toString())
    : [];

  if (!columns.includes('attivo')) {
    await db.execute('ALTER TABLE giardinieri ADD COLUMN attivo INTEGER NOT NULL DEFAULT 0', []);
  }
}

export async function ensureClientiTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT, codice TEXT NOT NULL DEFAULT "", attivo INTEGER NOT NULL DEFAULT 1)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('clienti')", []);
  const columns = Array.isArray(columnsResult.rows)
    ? columnsResult.rows.map((row: any) =>
        row?.name?.toString() ?? row?.[1]?.toString() ?? Object.values(row)[1]?.toString()
      )
    : [];

  if (!columns.includes('codice')) {
    await db.execute('ALTER TABLE clienti ADD COLUMN codice TEXT NOT NULL DEFAULT ""', []);
  }

  if (!columns.includes('attivo')) {
    await db.execute('ALTER TABLE clienti ADD COLUMN attivo INTEGER NOT NULL DEFAULT 1', []);
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