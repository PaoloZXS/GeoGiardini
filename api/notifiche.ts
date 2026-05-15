import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function normalizeColumnName(raw: unknown) {
  return (raw ?? '').toString().trim().toLowerCase();
}

function extractTableColumns(rows: any[] | undefined) {
  if (!Array.isArray(rows)) return [] as string[];

  const found = new Set<string>();
  for (const row of rows) {
    const name = row?.name ?? row?.column_name ?? row?.column;
    if (name != null) {
      found.add(normalizeColumnName(name));
      continue;
    }
    if (Array.isArray(row) && row.length > 1) {
      found.add(normalizeColumnName(row[1]));
      continue;
    }
    const values = Object.values(row ?? {});
    if (values.length > 1) {
      found.add(normalizeColumnName(values[1]));
    }
  }

  return [...found].filter(Boolean);
}

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

async function safeAddColumn(db: ReturnType<typeof createDbClient>, sql: string) {
  try {
    await db.execute(sql, []);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('duplicate column name') || message.includes('already exists')) {
      return;
    }
    throw error;
  }
}

async function ensureGiardinieriTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS giardinieri (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL, attivo INTEGER NOT NULL DEFAULT 0)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('giardinieri')", []);
  const columns = extractTableColumns(columnsResult.rows);
  if (!columns.includes('attivo')) {
    await safeAddColumn(db, 'ALTER TABLE giardinieri ADD COLUMN attivo INTEGER NOT NULL DEFAULT 0');
  }
}

async function ensureClientiTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT, codice TEXT NOT NULL DEFAULT "", attivo INTEGER NOT NULL DEFAULT 1)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('clienti')", []);
  const columns = extractTableColumns(columnsResult.rows);
  if (!columns.includes('codice')) {
    await safeAddColumn(db, 'ALTER TABLE clienti ADD COLUMN codice TEXT NOT NULL DEFAULT ""');
  }
  if (!columns.includes('attivo')) {
    await safeAddColumn(db, 'ALTER TABLE clienti ADD COLUMN attivo INTEGER NOT NULL DEFAULT 1');
  }
}

async function ensureNotificheTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS notifiche (id TEXT PRIMARY KEY, giardiniere_id TEXT NOT NULL, appuntamento_id TEXT NOT NULL, cliente_id TEXT, title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('notifiche')", []);
  const columns = extractTableColumns(columnsResult.rows);
  if (!columns.includes('cliente_id')) {
    await safeAddColumn(db, 'ALTER TABLE notifiche ADD COLUMN cliente_id TEXT');
  }
}

export default async function handler(req: any, res: any) {
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  try {
    if (method === 'GET') {
      await ensureNotificheTable(db);
      const giardiniereId = req.query.giardiniereId?.toString()?.trim();
      const readFilter = req.query.read?.toString()?.trim();

      const whereClauses: string[] = [];
      const params: any[] = [];

      if (giardiniereId) {
        whereClauses.push('n.giardiniere_id = ?');
        params.push(giardiniereId);
      }
      if (readFilter === '0' || readFilter === 'false') {
        whereClauses.push('n.read = 0');
      } else if (readFilter === '1' || readFilter === 'true') {
        whereClauses.push('n.read = 1');
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const result = await db.execute(
        `SELECT n.id, n.giardiniere_id, gi.username AS giardiniere_username, n.appuntamento_id, n.cliente_id, c.nome AS cliente_nome, n.title, n.message, n.read, n.created_at FROM notifiche n LEFT JOIN giardinieri gi ON gi.id = n.giardiniere_id LEFT JOIN clienti c ON c.id = n.cliente_id ${whereSql} ORDER BY n.created_at DESC`,
        params
      );

      return res.json({ success: true, notifiche: Array.isArray(result.rows) ? result.rows : [] });
    }

    if (method === 'POST') {
      const { title, message, giardinieriIds, clienteId } = req.body ?? {};
      const trimmedTitle = title?.toString().trim() || 'Messaggio dall\' Amministratore';
      const trimmedMessage = message?.toString().trim();
      const trimmedClienteId = clienteId?.toString().trim();
      const selectedGiardinieri = Array.isArray(giardinieriIds)
        ? giardinieriIds.map((item) => item?.toString().trim()).filter(Boolean)
        : [];

      if (!trimmedMessage) {
        return res.status(400).json({ success: false, message: 'Messaggio è obbligatorio.' });
      }

      await ensureGiardinieriTable(db);
      await ensureNotificheTable(db);

      let recipients = selectedGiardinieri;
      if (recipients.length === 0) {
        const giardinieriResult = await db.execute('SELECT id FROM giardinieri WHERE attivo = 1', []);
        const giardinieriRows = Array.isArray(giardinieriResult.rows) ? giardinieriResult.rows : [];
        recipients = giardinieriRows.map((row: any) => row?.id?.toString?.()).filter(Boolean);
      }

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Nessun giardiniere selezionato o attivo.' });
      }

      const createdAt = new Date().toISOString();
      for (const giardiniereId of recipients) {
        await db.execute(
          'INSERT INTO notifiche (id, giardiniere_id, appuntamento_id, cliente_id, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [crypto.randomUUID(), giardiniereId, '', trimmedClienteId || null, trimmedTitle, trimmedMessage, 0, createdAt]
        );
      }

      return res.json({ success: true });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Notifiche API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
