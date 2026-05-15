import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

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

async function ensureAttivitaTable(db: ReturnType<typeof createDbClient>) {
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
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  try {
    if (method === 'POST') {
      const { description } = req.body ?? {};
      const trimmedDescription = description?.toString().trim();

      if (!trimmedDescription) {
        return res.status(400).json({ success: false, message: 'La descrizione dell\'attività è obbligatoria.' });
      }

      await ensureAttivitaTable(db);
      await db.execute('INSERT INTO attivita (id, description, completed, created_at) VALUES (?, ?, ?, ?)', [
        crypto.randomUUID(),
        trimmedDescription,
        0,
        new Date().toISOString(),
      ]);

      return res.json({ success: true });
    }

    if (method === 'GET') {
      await ensureAttivitaTable(db);
      const result = await db.execute('SELECT id, description, completed, created_at FROM attivita ORDER BY LOWER(description) ASC', []);
      return res.json({ success: true, attivita: result.rows || [] });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno del server.';
    console.error('Attivita API error', error);
    return res.status(500).json({ success: false, message });
  }
}
