import { createDbClient, ensureAttivitaTable } from '../../lib/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const db = createDbClient();

    if (req.method === 'GET') {
      await ensureAttivitaTable(db);
      const result = await db.execute('SELECT id, description, completed, created_at FROM attivita ORDER BY LOWER(description) ASC', []);
      return res.status(200).json({ success: true, attivita: result.rows || [] });
    }

    const { description } = req.body ?? {};
    const trimmedDescription = description?.toString().trim();
    if (!trimmedDescription) {
      return res.status(400).json({ success: false, message: 'La descrizione dell\'attività è obbligatoria.' });
    }
    await ensureAttivitaTable(db);
    await db.execute('INSERT INTO attivita (id, description, completed, created_at) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), trimmedDescription, 0, new Date().toISOString()]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Attivita API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
