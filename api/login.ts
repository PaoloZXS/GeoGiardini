import { createDbClient, ensureClientiTable, ensureGiardinieriTable } from '../lib/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { role, username, code } = req.body ?? {};
    const trimmedRole = typeof role === 'string' ? role : '';
    const trimmedUsername = username?.toString().trim();
    const trimmedCode = code?.toString().trim();

    if (!['cliente', 'giardiniere'].includes(trimmedRole)) {
      return res.status(400).json({ success: false, message: 'Ruolo non valido.' });
    }

    if (!trimmedUsername || !trimmedCode) {
      return res.status(400).json({ success: false, message: 'Nome e codice sono obbligatori.' });
    }

    const db = createDbClient();
    await ensureClientiTable(db);
    await ensureGiardinieriTable(db);

    const query =
      trimmedRole === 'giardiniere'
        ? 'SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) AND codice = ? LIMIT 1'
        : 'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND codice = ? LIMIT 1';

    const result = await db.execute(query, [trimmedUsername, trimmedCode]);
    const rows = Array.isArray(result.rows) ? result.rows : [];

    if (rows.length > 0) {
      return res.status(200).json({ success: true, role: trimmedRole, username: trimmedUsername });
    }

    return res.status(401).json({ success: false, message: 'Credenziali errate.' });
  } catch (error) {
    console.error('Login API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
