import { createDbClient, ensureClientiTable } from '../lib/db';

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
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, clienti: result.rows || [] }));
      return;
    }

    const { nome, indirizzo, telefono, codice, attivo } = req.body ?? {};
    const trimmedNome = nome?.toString().trim();
    const trimmedIndirizzo = indirizzo?.toString().trim();
    const trimmedTelefono = telefono?.toString().trim() ?? '';
    const trimmedCodice = codice?.toString().trim();
    const isActive = attivo ? 1 : 0;

    if (!trimmedNome || !trimmedIndirizzo || !trimmedCodice) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Nome, indirizzo e codice sono obbligatori.' }));
      return;
    }

    await ensureClientiTable(db);
    const existingClient = await db.execute('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) LIMIT 1', [trimmedNome]);
    if (existingClient.rows.length > 0) {
      res.statusCode = 409;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Cliente già presente. Usa un altro nome.' }));
      return;
    }

    await db.execute('INSERT INTO clienti (nome, indirizzo, telefono, codice, attivo) VALUES (?, ?, ?, ?, ?)', [trimmedNome, trimmedIndirizzo, trimmedTelefono, trimmedCodice, isActive]);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('Clienti API error', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Errore interno del server.' }));
  }
}
