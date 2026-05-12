import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const tableName = 'giardinieri';

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

async function ensureGiardinieriTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL, attivo INTEGER NOT NULL DEFAULT 0)`,
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('giardinieri')", []);
  const columns = Array.isArray(columnsResult.rows)
    ? columnsResult.rows.map((row: any) => row?.name?.toString() ?? row?.[1]?.toString() ?? Object.values(row)[1]?.toString())
    : [];

  if (!columns.includes('attivo')) {
    await db.execute('ALTER TABLE giardinieri ADD COLUMN attivo INTEGER NOT NULL DEFAULT 0', []);
  }
}

export default async function handler(req: any, res: any) {
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  try {
    if (method === 'POST') {
      const { username, codice, attivo } = req.body ?? {};
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();
      const isActive = attivo ? 1 : 0;

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      await ensureGiardinieriTable(db);

      const existing = await db.execute(
        `SELECT id FROM ${tableName} WHERE LOWER(username) = LOWER(?) LIMIT 1`,
        [trimmedUsername]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
      }

      await db.execute(
        `INSERT INTO ${tableName} (id, username, codice, created_at, attivo) VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), trimmedUsername, trimmedCodice, new Date().toISOString(), isActive]
      );

      return res.json({ success: true });
    }

    if (method === 'GET') {
      await ensureGiardinieriTable(db);

      const result = await db.execute(
        `SELECT id, username, codice, created_at, attivo FROM ${tableName} ORDER BY created_at DESC`,
        []
      );
      return res.json({ success: true, giardinieri: result.rows || [] });
    }

    return res.status(405).json({ success: false, message: 'Metodo non consentito.' });
  } catch (error) {
    console.error('Giardinieri API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
