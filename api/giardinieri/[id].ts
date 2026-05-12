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

export default async function handler(req: any, res: any) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const id = req.query.id || req.query.slug?.[0] || null;
  const { username, codice } = req.body ?? {};
  const trimmedUsername = username?.toString().trim();
  const trimmedCodice = codice?.toString().trim();

  if (!id || !trimmedUsername || !trimmedCodice) {
    return res.status(400).json({ success: false, message: 'ID, username e codice sono obbligatori.' });
  }

  const db = createDbClient();

  try {
    const existing = await db.execute(
      `SELECT id FROM ${tableName} WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1`,
      [trimmedUsername, id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
    }

    await db.execute(
      `UPDATE ${tableName} SET username = ?, codice = ? WHERE id = ?`,
      [trimmedUsername, trimmedCodice, id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Updating giardiniere failed', error);
    return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento.' });
  }
}
