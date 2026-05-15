import { createDbClient, ensureClientiTable, ensureGiardinieriTable, ensureAppuntamentiTable, ensureAppuntamentoGiardinieriTable, ensureAppuntamentoAttivitaTable, ensureNotificheTable } from '../lib/db';

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
      await ensureAppuntamentiTable(db);
      await ensureAppuntamentoGiardinieriTable(db);
      await ensureAppuntamentoAttivitaTable(db);
      await ensureClientiTable(db);
      await ensureGiardinieriTable(db);

      const giardiniereId = req.query.giardiniereId?.toString()?.trim();
      const clienteId = req.query.clienteId?.toString()?.trim();
      const whereClauses: string[] = [];
      const params: any[] = [];
      if (giardiniereId) {
        whereClauses.push('ag.giardiniere_id = ?');
        params.push(giardiniereId);
      }
      if (clienteId) {
        whereClauses.push('a.cliente_id = ?');
        params.push(clienteId);
      }
      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const result = await db.execute(
        `SELECT
          a.id AS appointment_id,
          a.data AS appointment_date,
          a.cliente_id AS cliente_id,
          c.nome AS cliente_nome,
          a.note AS appointment_note,
          a.created_at AS appointment_created_at,
          gi.id AS giardiniere_id,
          gi.username AS giardiniere_username,
          aa.description AS activity_description
        FROM appuntamenti a
        LEFT JOIN clienti c ON c.id = a.cliente_id
        LEFT JOIN appuntamento_giardinieri ag ON ag.appuntamento_id = a.id
        LEFT JOIN giardinieri gi ON gi.id = ag.giardiniere_id
        LEFT JOIN appuntamento_attivita aa ON aa.appuntamento_id = a.id
        ${whereSql}
        ORDER BY a.data DESC, a.created_at DESC`,
        params
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      const appointmentsMap = new Map<string, any>();
      for (const row of rows) {
        const appointmentId = row?.appointment_id?.toString();
        if (!appointmentId) continue;
        if (!appointmentsMap.has(appointmentId)) {
          appointmentsMap.set(appointmentId, {
            id: appointmentId,
            data: row?.appointment_date ?? '',
            clienteId: row?.cliente_id ?? '',
            clienteNome: row?.cliente_nome ?? '',
            note: row?.appointment_note ?? '',
            createdAt: row?.appointment_created_at ?? '',
            giardinieri: [],
            attivita: [],
          });
        }
        const appointment = appointmentsMap.get(appointmentId);
        const giardiniereIdValue = row?.giardiniere_id?.toString();
        const giardiniereUsernameValue = row?.giardiniere_username?.toString();
        if (giardiniereIdValue && giardiniereUsernameValue) {
          if (!appointment.giardinieri.some((item: any) => item.id === giardiniereIdValue)) {
            appointment.giardinieri.push({ id: giardiniereIdValue, username: giardiniereUsernameValue });
          }
        }
        const activityDescription = row?.activity_description?.toString();
        if (activityDescription && !appointment.attivita.includes(activityDescription)) {
          appointment.attivita.push(activityDescription);
        }
      }
      return res.status(200).json({ success: true, appointments: Array.from(appointmentsMap.values()) });
    }

    const { data, clienteId, giardinieriIds, attivita, note } = req.body ?? {};
    const trimmedData = data?.toString().trim();
    const trimmedClienteId = clienteId?.toString().trim();
    const selectedGiardinieri = Array.isArray(giardinieriIds)
      ? giardinieriIds.map((item) => item?.toString().trim()).filter(Boolean)
      : [];
    const selectedAttivita = Array.isArray(attivita)
      ? attivita.map((item) => item?.toString().trim()).filter(Boolean)
      : [];
    const noteText = note?.toString().trim() ?? '';
    if (!trimmedData || !trimmedClienteId || selectedGiardinieri.length === 0) {
      return res.status(400).json({ success: false, message: 'Data, cliente e almeno un giardiniere sono obbligatori.' });
    }

    await ensureClientiTable(db);
    await ensureGiardinieriTable(db);
    await ensureAppuntamentiTable(db);
    await ensureAppuntamentoGiardinieriTable(db);
    await ensureAppuntamentoAttivitaTable(db);
    await ensureNotificheTable(db);

    const clientResult = await db.execute('SELECT nome FROM clienti WHERE id = ? LIMIT 1', [trimmedClienteId]);
    const clientRows = Array.isArray(clientResult.rows) ? clientResult.rows : [];
    const clienteNome = clientRows[0]?.nome?.toString?.() ?? 'cliente';
    const appointmentId = crypto.randomUUID();
    await db.execute('INSERT INTO appuntamenti (id, data, cliente_id, note, created_at) VALUES (?, ?, ?, ?, ?)', [appointmentId, trimmedData, trimmedClienteId, noteText, new Date().toISOString()]);
    for (const giardiniereId of selectedGiardinieri) {
      await db.execute('INSERT INTO appuntamento_giardinieri (id, appuntamento_id, giardiniere_id) VALUES (?, ?, ?)', [crypto.randomUUID(), appointmentId, giardiniereId]);
    }
    for (const activity of selectedAttivita) {
      await db.execute('INSERT INTO appuntamento_attivita (id, appuntamento_id, description) VALUES (?, ?, ?)', [crypto.randomUUID(), appointmentId, activity]);
    }
    const formattedDate = new Date(trimmedData).toLocaleDateString('it-IT');
    const notificationTitle = 'Appuntamento da :';
    const notificationMessage = `Cliente : ${clienteNome}\nAttività da svolgere : ${selectedAttivita.join(', ')}\nData Appuntamento : ${formattedDate}`;
    for (const giardiniereId of selectedGiardinieri) {
      await db.execute('INSERT INTO notifiche (id, giardiniere_id, appuntamento_id, cliente_id, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), giardiniereId, appointmentId, '', notificationTitle, notificationMessage, 0, new Date().toISOString()]);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Appuntamenti API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
