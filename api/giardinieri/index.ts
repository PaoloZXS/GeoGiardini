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

export default async function handler(req: any, res: any) {
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  try {
    if (method === 'POST') {
      const { username, codice } = req.body ?? {};
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL)`,
        []
      );

      const existing = await db.execute(
        `SELECT id FROM ${tableName} WHERE LOWER(username) = LOWER(?) LIMIT 1`,
        [trimmedUsername]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
      }

      await db.execute(
        `INSERT INTO ${tableName} (id, username, codice, created_at) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), trimmedUsername, trimmedCodice, new Date().toISOString()]
      );

      return res.json({ success: true });
    }

    if (method === 'GET') {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL)`,
        []
      );

      const result = await db.execute(
        `SELECT id, username, codice, created_at FROM ${tableName} ORDER BY created_at DESC`,
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
