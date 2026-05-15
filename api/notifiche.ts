import { createDbClient, ensureGiardinieriTable, ensureNotificheTable } from '../lib/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const db = createDbClient();
    await ensureNotificheTable(db);

    if (req.method === 'GET') {
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
      return res.status(200).json({ success: true, notifiche: result.rows || [] });
    }

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
      await db.execute('INSERT INTO notifiche (id, giardiniere_id, appuntamento_id, cliente_id, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), giardiniereId, '', trimmedClienteId || null, trimmedTitle, trimmedMessage, 0, createdAt]);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notifiche API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
