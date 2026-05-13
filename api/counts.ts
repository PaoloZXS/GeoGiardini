import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient() {
  if (!databaseUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
  }
  return createClient({ url: databaseUrl, authToken });
}

async function ensureTable(db: ReturnType<typeof createDbClient>, sql: string) {
  await db.execute(sql, []);
}

function extractCount(result: any) {
  const row = result.rows?.[0];
  if (!row) return 0;
  if (Array.isArray(row)) return Number(row[0] ?? 0);
  if (typeof row === 'object') return Number(Object.values(row)[0] ?? 0);
  return 0;
}

const activeValuesSql = "'1','true','t','yes','y','on','si'";

function buildActivePredicate(columnName: string) {
  return `(CASE
    WHEN ${columnName} IS NULL THEN 0
    WHEN LOWER(TRIM(CAST(${columnName} AS TEXT))) IN (${activeValuesSql}) THEN 1
    ELSE 0
  END) = 1`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = createDbClient();
    await ensureTable(db, 'CREATE TABLE IF NOT EXISTS giardinieri (id TEXT PRIMARY KEY, username TEXT NOT NULL, codice TEXT NOT NULL, created_at TEXT NOT NULL, attivo INTEGER NOT NULL DEFAULT 0)');
    await ensureTable(db, 'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT, codice TEXT NOT NULL DEFAULT "", attivo INTEGER NOT NULL DEFAULT 1)');

    const giardinieriActivePredicate = buildActivePredicate('attivo');
    const giardinieriInactivePredicate = `NOT (${giardinieriActivePredicate})`;
    const clientiActivePredicate = buildActivePredicate('attivo');
    const clientiInactivePredicate = `NOT (${clientiActivePredicate})`;

    const [giardResult, clientResult, giardActiveResult, giardInactiveResult, activeResult, inactiveResult] = await Promise.all([
      db.execute('SELECT COUNT(*) FROM giardinieri', []),
      db.execute('SELECT COUNT(*) FROM clienti', []),
      db.execute(`SELECT COUNT(*) FROM giardinieri WHERE ${giardinieriActivePredicate}`, []),
      db.execute(`SELECT COUNT(*) FROM giardinieri WHERE ${giardinieriInactivePredicate}`, []),
      db.execute(`SELECT COUNT(*) FROM clienti WHERE ${clientiActivePredicate}`, []),
      db.execute(`SELECT COUNT(*) FROM clienti WHERE ${clientiInactivePredicate}`, []),
    ]);

    return res.json({
      success: true,
      giardinieriCount: extractCount(giardResult),
      giardinieriActiveCount: extractCount(giardActiveResult),
      giardinieriInactiveCount: extractCount(giardInactiveResult),
      clientiCount: extractCount(clientResult),
      clientiActiveCount: extractCount(activeResult),
      clientiInactiveCount: extractCount(inactiveResult),
    });
  } catch (error) {
    console.error('Counting totals failed', error);
    return res.status(500).json({
      success: false,
      giardinieriCount: 0,
      giardinieriActiveCount: 0,
      giardinieriInactiveCount: 0,
      clientiCount: 0,
      clientiActiveCount: 0,
      clientiInactiveCount: 0,
      message: 'Errore conteggio totali.',
    });
  }
}
