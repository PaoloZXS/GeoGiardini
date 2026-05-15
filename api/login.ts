import { createDbClient } from '../lib/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const { role, username, code } = req.body ?? {};
    if (!['admin', 'giardiniere', 'cliente'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Ruolo di login non valido.' });
    }
    if (!username || !code) {
      return res.status(400).json({ success: false, message: 'Nome e codice sono obbligatori.' });
    }
    if (role === 'admin') {
      if (username === 'Angelo' && code === 'A2026') {
        return res.status(200).json({ success: true, role, username });
      }
      return res.status(401).json({ success: false, message: 'Credenziali admin errate.' });
    }

    const db = createDbClient();
    const query =
      role === 'giardiniere'
        ? 'SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) AND codice = ? LIMIT 1'
        : 'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND codice = ? LIMIT 1';

    const result = await db.execute(query, [username.trim(), code.trim()]);
    const rows = Array.isArray(result.rows) ? result.rows : [];

    if (rows.length > 0) {
      const firstRow = rows[0] as any;
      const userId =
        firstRow?.id?.toString?.() ??
        firstRow?.ID?.toString?.() ??
        firstRow?.Id?.toString?.() ??
        (Array.isArray(firstRow) ? firstRow[0]?.toString?.() : undefined) ??
        Object.values(firstRow)[0]?.toString?.();

      return res.status(200).json({ success: true, role, username, id: userId });
    }

    return res.status(401).json({ success: false, message: 'Credenziali errate.' });
  } catch (error) {
    console.error('Login API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
