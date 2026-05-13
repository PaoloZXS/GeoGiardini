import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

async function ensureClientiTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT, codice TEXT NOT NULL DEFAULT "", attivo INTEGER NOT NULL DEFAULT 1)',
    []
  );
  const columnsResult = await db.execute("PRAGMA table_info('clienti')", []);
  const columns = Array.isArray(columnsResult.rows)
    ? columnsResult.rows.map((row: any) => (row?.name ?? '').toString().toLowerCase()).filter(Boolean)
    : [];
  if (!columns.includes('codice')) {
    try { await db.execute('ALTER TABLE clienti ADD COLUMN codice TEXT NOT NULL DEFAULT ""', []); } catch (_) {}
  }
  if (!columns.includes('attivo')) {
    try { await db.execute('ALTER TABLE clienti ADD COLUMN attivo INTEGER NOT NULL DEFAULT 1', []); } catch (_) {}
  }
}

export default async function handler(req: any, res: any) {
  const method = (req.method || 'GET').toUpperCase();
  const id = req.query.id || req.query.slug?.[0] || null;
  const db = createDbClient();

  try {
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID obbligatorio.' });
    }

    if (method === 'DELETE') {
      await ensureClientiTable(db);
      await db.execute('DELETE FROM clienti WHERE id = ?', [id]);
      return res.json({ success: true });
    }

    if (method !== 'PUT') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
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

    const existing = await db.execute(
      'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND id != ? LIMIT 1',
      [trimmedNome, id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Cliente già presente. Usa un altro nome.' });
    }

    await db.execute(
      'UPDATE clienti SET nome = ?, indirizzo = ?, telefono = ?, codice = ?, attivo = ? WHERE id = ?',
      [trimmedNome, trimmedIndirizzo, trimmedTelefono, trimmedCodice, isActive, id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Clienti id API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
