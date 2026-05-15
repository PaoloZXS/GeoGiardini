import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

export default async function handler(req: any, res: any) {
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  if (method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id } = req.query ?? {};
    const notificationId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Id notifica mancante.' });
    }

    await db.execute('UPDATE notifiche SET read = 1 WHERE id = ?', [notificationId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read failed', error);
    return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento della notifica.' });
  }
}
