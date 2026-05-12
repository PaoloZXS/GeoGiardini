import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

const tableName = 'giardinieri';

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
  const id = req.query.id || req.query.slug?.[0] || null;
  const db = createDbClient();

  try {
    if (method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID obbligatorio per eliminare.' });
      }

      await db.execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      return res.json({ success: true });
    }

    if (method !== 'PUT') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, codice, attivo } = req.body ?? {};
    const trimmedUsername = username?.toString().trim();
    const trimmedCodice = codice?.toString().trim();
    const isActive = attivo ? 1 : 0;

    if (!id || !trimmedUsername || !trimmedCodice) {
      return res.status(400).json({ success: false, message: 'ID, username e codice sono obbligatori.' });
    }

    await ensureGiardinieriTable(db);

    const existing = await db.execute(
      `SELECT id FROM ${tableName} WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1`,
      [trimmedUsername, id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
    }

    await db.execute(
      `UPDATE ${tableName} SET username = ?, codice = ?, attivo = ? WHERE id = ?`,
      [trimmedUsername, trimmedCodice, isActive, id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Giardiniere API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
