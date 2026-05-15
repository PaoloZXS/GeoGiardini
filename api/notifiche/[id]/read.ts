import { createDbClient, ensureNotificheTable } from '../../../lib/db';

export default async function handler(req: any, res: any) {
  const id = req.query?.id?.toString?.();
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Id notifica mancante.' }));
    return;
  }

  if (req.method !== 'PUT') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const db = createDbClient();
    await ensureNotificheTable(db);
    await db.execute('UPDATE notifiche SET read = 1 WHERE id = ?', [id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notifiche read API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
