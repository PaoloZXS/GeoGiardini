import { createDbClient, ensureGiardinieriTable } from '../../lib/db';

export default async function handler(req: any, res: any) {
  const id = req.query?.id?.toString?.();
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Id giardiniere mancante.' }));
    return;
  }

  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const db = createDbClient();
    await ensureGiardinieriTable(db);

    if (req.method === 'PUT') {
      const { username, codice, attivo } = req.body ?? {};
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();
      const isActive = attivo ? 1 : 0;

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      const existing = await db.execute('SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1', [trimmedUsername, id]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
      }

      await db.execute('UPDATE giardinieri SET username = ?, codice = ?, attivo = ? WHERE id = ?', [trimmedUsername, trimmedCodice, isActive, id]);
      return res.status(200).json({ success: true });
    }

    await db.execute('DELETE FROM giardinieri WHERE id = ?', [id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Giardinieri id API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
