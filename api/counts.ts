import { createDbClient, ensureGiardinieriTable, ensureClientiTable, extractCount } from '../lib/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const db = createDbClient();
    await ensureGiardinieriTable(db);
    await ensureClientiTable(db);

    const [giardResult, clientResult, giardActiveResult, giardInactiveResult, activeResult, inactiveResult] = await Promise.all([
      db.execute('SELECT COUNT(*) FROM giardinieri', []),
      db.execute('SELECT COUNT(*) FROM clienti', []),
      db.execute('SELECT COUNT(*) FROM giardinieri WHERE attivo = 1', []),
      db.execute('SELECT COUNT(*) FROM giardinieri WHERE attivo = 0', []),
      db.execute('SELECT COUNT(*) FROM clienti WHERE attivo = 1', []),
      db.execute('SELECT COUNT(*) FROM clienti WHERE attivo = 0', []),
    ]);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      giardinieriCount: extractCount(giardResult),
      giardinieriActiveCount: extractCount(giardActiveResult),
      giardinieriInactiveCount: extractCount(giardInactiveResult),
      clientiCount: extractCount(clientResult),
      clientiActiveCount: extractCount(activeResult),
      clientiInactiveCount: extractCount(inactiveResult),
    }));
  } catch (error: any) {
    console.error('Counts API error', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Errore interno del server.' }));
  }
}
