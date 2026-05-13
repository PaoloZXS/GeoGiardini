import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function normalizeColumnName(raw: unknown) {
  return (raw ?? '').toString().trim().toLowerCase();
}

function extractTableColumns(rows: any[] | undefined) {
  if (!Array.isArray(rows)) return [] as string[];

  const found = new Set<string>();
  for (const row of rows) {
    const name = row?.name ?? row?.column_name ?? row?.column;
    if (name != null) {
      found.add(normalizeColumnName(name));
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

  return [...found].filter(Boolean);
}

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
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

async function ensureGiardinieriTable(db: ReturnType<typeof createDbClient>) {
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

async function ensureClientiTable(db: ReturnType<typeof createDbClient>) {
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { role, username, code } = req.body ?? {};
    const trimmedRole = typeof role === 'string' ? role : '';
    const trimmedUsername = username?.toString().trim();
    const trimmedCode = code?.toString().trim();

    if (!['cliente', 'giardiniere'].includes(trimmedRole)) {
      return res.status(400).json({ success: false, message: 'Ruolo non valido.' });
    }

    if (!trimmedUsername || !trimmedCode) {
      return res.status(400).json({ success: false, message: 'Nome e codice sono obbligatori.' });
    }

    const db = createDbClient();
    await ensureClientiTable(db);
    await ensureGiardinieriTable(db);

    const query =
      trimmedRole === 'giardiniere'
        ? 'SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) AND codice = ? LIMIT 1'
        : 'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND codice = ? LIMIT 1';

    const result = await db.execute(query, [trimmedUsername, trimmedCode]);
    const rows = Array.isArray(result.rows) ? result.rows : [];

    if (rows.length > 0) {
      return res.status(200).json({ success: true, role: trimmedRole, username: trimmedUsername });
    }

    return res.status(401).json({ success: false, message: 'Credenziali errate.' });
  } catch (error) {
    console.error('Login API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
