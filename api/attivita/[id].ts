import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

async function ensureAttivitaTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS attivita (id TEXT PRIMARY KEY, description TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
    []
  );
}

export default async function handler(req: any, res: any) {
  const method = (req.method || 'GET').toUpperCase();
  const id = req.query.id || req.query.slug?.[0] || null;
  const db = createDbClient();

  try {
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID obbligatorio.' });
    }

    if (method === 'DELETE') {
      await ensureAttivitaTable(db);
      await db.execute('DELETE FROM attivita WHERE id = ?', [id]);
      return res.json({ success: true });
    }

    if (method !== 'PUT') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { description, completed } = req.body ?? {};
    const trimmedDescription = description?.toString().trim();
    const isCompleted = completed ? 1 : 0;

    if (trimmedDescription === undefined && completed === undefined) {
      return res.status(400).json({ success: false, message: 'Dati attività non validi.' });
    }

    await ensureAttivitaTable(db);
    const updates: string[] = [];
    const params: any[] = [];

    if (trimmedDescription !== undefined) {
      updates.push('description = ?');
      params.push(trimmedDescription);
    }
    if (completed !== undefined) {
      updates.push('completed = ?');
      params.push(isCompleted);
    }
    params.push(id);

    await db.execute(`UPDATE attivita SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.json({ success: true });
  } catch (error) {
    console.error('Attivita id API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
