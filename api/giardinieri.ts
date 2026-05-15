import { createDbClient, ensureGiardinieriTable } from '../lib/db';

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
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, giardinieri: result.rows || [] }));
      return;
    }

    const { username, codice, attivo } = req.body ?? {};
    const trimmedUsername = username?.toString().trim();
    const trimmedCodice = codice?.toString().trim();
    const isActive = attivo ? 1 : 0;

    if (!trimmedUsername || !trimmedCodice) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Username e codice sono obbligatori.' }));
      return;
    }

    await ensureGiardinieriTable(db);
    const existing = await db.execute('SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) LIMIT 1', [trimmedUsername]);
    if (existing.rows.length > 0) {
      res.statusCode = 409;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Username già presente. Usa un altro username.' }));
      return;
    }

    await db.execute('INSERT INTO giardinieri (id, username, codice, created_at, attivo) VALUES (?, ?, ?, ?, ?)', [crypto.randomUUID(), trimmedUsername, trimmedCodice, new Date().toISOString(), isActive]);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('Giardinieri API error', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Errore interno del server.' }));
  }
}
