import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

const tableName = 'giardinieri';

async function ensureGiardinieriTable(db: ReturnType<typeof createDbClient>) {
  const existingTablesResult = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('giardinieri', 'giardinieri_fix')",
    []
  );
  const existingTables = Array.isArray(existingTablesResult.rows)
    ? existingTablesResult.rows.map((row: any) => row[0]?.toString())
    : [];

  const hasGiardinieri = existingTables.includes('giardinieri');
  const hasFix = existingTables.includes('giardinieri_fix');

  if (!hasGiardinieri) {
    await db.execute(
      'CREATE TABLE giardinieri (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL)',
      []
    );
    if (hasFix) {
      await db.execute(
        'INSERT OR IGNORE INTO giardinieri (id, username, codice, created_at) SELECT CAST(id AS TEXT), CAST(username AS TEXT), CAST(codice AS TEXT), CAST(created_at AS TEXT) FROM giardinieri_fix',
        []
      );
      await db.execute('DROP TABLE IF EXISTS giardinieri_fix', []);
    }
    return;
  }

  if (hasFix) {
    const tempTable = 'giardinieri_migration';
    await db.execute(
      `CREATE TABLE IF NOT EXISTS ${tempTable} (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL)`,
      []
    );
    await db.execute(
      `INSERT OR IGNORE INTO ${tempTable} (id, username, codice, created_at) SELECT CAST(id AS TEXT), CAST(username AS TEXT), CAST(codice AS TEXT), CAST(created_at AS TEXT) FROM giardinieri_fix`,
      []
    );
    await db.execute(
      `INSERT OR IGNORE INTO ${tempTable} (id, username, codice, created_at) SELECT CAST(id AS TEXT), CAST(username AS TEXT), CAST(codice AS TEXT), CAST(created_at AS TEXT) FROM giardinieri`,
      []
    );
    await db.execute('DROP TABLE IF EXISTS giardinieri_fix', []);
    await db.execute('DROP TABLE IF EXISTS giardinieri', []);
    await db.execute(`ALTER TABLE ${tempTable} RENAME TO giardinieri`, []);
  }
}

async function ensureClientiTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT)',
    []
  );
}

function extractCount(result: any) {
  const row = result.rows?.[0];
  if (!row) return 0;
  if (Array.isArray(row)) {
    return Number(row[0] ?? 0);
  }
  if (typeof row === 'object') {
    const firstValue = Object.values(row)[0];
    return Number(firstValue ?? 0);
  }
  return 0;
}

export default async function handler(req: any, res: any) {
  const rawUrl = typeof req.url === 'string' ? req.url : '';
  const querySlug = Array.isArray(req.query.slug)
    ? req.query.slug
    : req.query.slug
    ? [req.query.slug]
    : req.query.path
    ? Array.isArray(req.query.path)
      ? req.query.path
      : [req.query.path]
    : [];
  const rawSlug = rawUrl.startsWith('/api/')
    ? rawUrl.replace(/^\/api\//, '').replace(/\?.*$/, '').split('/').filter(Boolean)
    : [];
  const slug = rawSlug.length >= querySlug.length ? rawSlug : querySlug;
  const path = slug.join('/');
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  try {
    if (path === 'giardinieri' && method === 'POST') {
      const { username, codice } = req.body ?? {};
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      await ensureGiardinieriTable(db);

      const existing = await db.execute(
        `SELECT id FROM ${tableName} WHERE LOWER(username) = LOWER(?) LIMIT 1`,
        [trimmedUsername]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
      }

      await db.execute(
        `INSERT INTO ${tableName} (id, username, codice, created_at) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), trimmedUsername, trimmedCodice, new Date().toISOString()]
      );

      return res.json({ success: true });
    }

    if (path === 'giardinieri' && method === 'GET') {
      await ensureGiardinieriTable(db);
      const result = await db.execute('SELECT id, username, codice, created_at FROM giardinieri ORDER BY created_at DESC', []);
      return res.json({ success: true, giardinieri: result.rows || [] });
    }

    if (path.startsWith('giardinieri/') && method === 'PUT') {
      const id = slug[1];
      const { username, codice } = req.body ?? {};
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      await ensureGiardinieriTable(db);

      const existing = await db.execute(
        `SELECT id FROM ${tableName} WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1`,
        [trimmedUsername, id]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Username già presente. Usa un altro username.' });
      }

      await db.execute(
        `UPDATE ${tableName} SET username = ?, codice = ? WHERE id = ?`,
        [trimmedUsername, trimmedCodice, id]
      );

      return res.json({ success: true });
    }

    if (path === 'clienti' && method === 'POST') {
      const { nome, indirizzo, telefono } = req.body ?? {};
      const trimmedNome = nome?.toString().trim();
      const trimmedIndirizzo = indirizzo?.toString().trim();
      const trimmedTelefono = telefono?.toString().trim() ?? '';

      if (!trimmedNome || !trimmedIndirizzo) {
        return res.status(400).json({ success: false, message: 'Nome e indirizzo sono obbligatori.' });
      }

      await ensureClientiTable(db);

      const existingClient = await db.execute('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) LIMIT 1', [trimmedNome]);
      if (existingClient.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Cliente già presente. Usa un altro nome.' });
      }

      await db.execute('INSERT INTO clienti (nome, indirizzo, telefono) VALUES (?, ?, ?)', [trimmedNome, trimmedIndirizzo, trimmedTelefono]);
      return res.json({ success: true });
    }

    if (path === 'clienti' && method === 'GET') {
      await ensureClientiTable(db);
      const result = await db.execute('SELECT id, nome, indirizzo, telefono FROM clienti ORDER BY id DESC', []);
      return res.json({ success: true, clienti: result.rows || [] });
    }

    if (path.startsWith('clienti/') && method === 'PUT') {
      const id = slug[1];
      const { nome, indirizzo, telefono } = req.body ?? {};
      const trimmedNome = nome?.toString().trim();
      const trimmedIndirizzo = indirizzo?.toString().trim();
      const trimmedTelefono = telefono?.toString().trim() ?? '';

      if (!trimmedNome || !trimmedIndirizzo) {
        return res.status(400).json({ success: false, message: 'Nome e indirizzo sono obbligatori.' });
      }

      await ensureClientiTable(db);
      const existing = await db.execute('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND id != ? LIMIT 1', [trimmedNome, id]);

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Cliente già presente. Usa un altro nome.' });
      }

      await db.execute('UPDATE clienti SET nome = ?, indirizzo = ?, telefono = ? WHERE id = ?', [trimmedNome, trimmedIndirizzo, trimmedTelefono, id]);
      return res.json({ success: true });
    }

    if (path === 'counts' && method === 'GET') {
      await ensureGiardinieriTable(db);
      await ensureClientiTable(db);
      const [giardResult, clientResult] = await Promise.all([
        db.execute('SELECT COUNT(*) FROM giardinieri', []),
        db.execute('SELECT COUNT(*) FROM clienti', []),
      ]);
      return res.json({
        success: true,
        giardinieriCount: extractCount(giardResult),
        clientiCount: extractCount(clientResult),
      });
    }

    return res.status(404).json({ success: false, message: 'Endpoint API non trovato.' });
  } catch (error) {
    console.error('API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
