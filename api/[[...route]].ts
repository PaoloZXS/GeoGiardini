function json(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizeValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (value == null) return undefined;
  if (typeof (value as any).toString === 'function') return (value as any).toString();
  return undefined;
}

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

async function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  const { createClient } = await import('@libsql/client');
  return createClient({ url: databaseUrl, authToken });
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

async function safeAddColumn(db: any, sql: string) {
  try {
    await db.execute(sql, []);
  } catch (error: any) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('duplicate column name') || message.includes('already exists')) {
      return;
    }
    throw error;
  }
}

async function ensureGiardinieriTable(db: any) {
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

async function ensureClientiTable(db: any) {
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

async function ensureAttivitaTable(db: any) {
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

export default async function handler(req: any, res: any) {
  const slug = req.query?.route;
  const segments = Array.isArray(slug) ? [...slug] : typeof slug === 'string' ? slug.split('/') : [];
  const path = '/' + segments.join('/');
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (path === '/hello' && method === 'GET') {
      return json(res, 200, {
        success: true,
        message: 'Hello from Vercel API.',
        env: {
          TURSO_DATABASE_URL: Boolean(databaseUrl),
          TURSO_AUTH_TOKEN: Boolean(authToken),
        },
      });
    }

    if (path === '/dbtest' && method === 'GET') {
      const db = await createDbClient();
      const result = await db.execute('SELECT 1', []);
      return json(res, 200, { success: true, result: result.rows || [] });
    }

    const db = await createDbClient();

    if (path === '/clienti' && method === 'GET') {
      await ensureClientiTable(db);
      const result = await db.execute('SELECT id, nome, indirizzo, telefono, codice, attivo FROM clienti ORDER BY id DESC', []);
      return json(res, 200, { success: true, clienti: result.rows || [] });
    }

    if (path === '/attivita' && method === 'GET') {
      await ensureAttivitaTable(db);
      const result = await db.execute('SELECT id, description, completed, created_at FROM attivita ORDER BY LOWER(description) ASC', []);
      return json(res, 200, { success: true, attivita: result.rows || [] });
    }

    return json(res, 404, { success: false, message: 'Endpoint non trovato.' });
  } catch (error: any) {
    return json(res, 500, { success: false, message: error?.message ?? 'Errore interno del server.' });
  }
}
