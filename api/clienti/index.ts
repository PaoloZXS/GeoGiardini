import { createDbClient, ensureClientiTable } from '../../lib/db';

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
      await ensureClientiTable(db);
      const result = await db.execute('SELECT id, nome, indirizzo, telefono, codice, attivo FROM clienti ORDER BY id DESC', []);
      return res.status(200).json({ success: true, clienti: result.rows || [] });
    }

    const { nome, indirizzo, telefono, codice, attivo } = req.body ?? {};
    const trimmedNome = nome?.toString().trim();
    const trimmedIndirizzo = indirizzo?.toString().trim();
    const trimmedTelefono = telefono?.toString().trim() ?? '';
    const trimmedCodice = codice?.toString().trim();
    const isActive = attivo ? 1 : 0;

    if (!trimmedNome || !trimmedIndirizzo || !trimmedCodice) {
      return res.status(400).json({ success: false, message: 'Nome, indirizzo e codice sono obbligatori.' });
    }

    await ensureClientiTable(db);
    const existingClient = await db.execute('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) LIMIT 1', [trimmedNome]);
    if (existingClient.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Cliente già presente. Usa un altro nome.' });
    }

    await db.execute('INSERT INTO clienti (nome, indirizzo, telefono, codice, attivo) VALUES (?, ?, ?, ?, ?)', [trimmedNome, trimmedIndirizzo, trimmedTelefono, trimmedCodice, isActive]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Clienti API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
