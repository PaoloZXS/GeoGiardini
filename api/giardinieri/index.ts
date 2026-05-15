import { createDbClient, ensureGiardinieriTable } from '../../lib/db';

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
      await ensureGiardinieriTable(db);
      const result = await db.execute('SELECT id, username, codice, created_at, attivo FROM giardinieri ORDER BY created_at DESC', []);
      return res.status(200).json({ success: true, giardinieri: result.rows || [] });
    }

    const { username, codice, attivo } = req.body ?? {};
    const trimmedUsername = username?.toString().trim();
    const trimmedCodice = codice?.toString().trim();
    const isActive = attivo ? 1 : 0;

    if (!trimmedUsername || !trimmedCodice) {
      return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
    }

    await ensureGiardinieriTable(db);
    const existing = await db.execute('SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) LIMIT 1', [trimmedUsername]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
    }

    await db.execute('INSERT INTO giardinieri (id, username, codice, created_at, attivo) VALUES (?, ?, ?, ?, ?)', [crypto.randomUUID(), trimmedUsername, trimmedCodice, new Date().toISOString(), isActive]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Giardinieri API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
