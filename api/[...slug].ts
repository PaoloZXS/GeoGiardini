import { createDbClient, ensureGiardinieriTable, ensureClientiTable, ensureAttivitaTable, extractCount } from '../lib/db';

function json(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizeValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (value == null) return undefined;
  if (typeof (value as any).toString === 'function') return (value as any).toString();
  return undefined;
}

async function ensureAppuntamentiTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS appuntamenti (id TEXT PRIMARY KEY, data TEXT NOT NULL, cliente_id INTEGER NOT NULL, note TEXT NOT NULL DEFAULT "", created_at TEXT NOT NULL)',
    []
  );
}

async function ensureAppuntamentoGiardinieriTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS appuntamento_giardinieri (id TEXT PRIMARY KEY, appuntamento_id TEXT NOT NULL, giardiniere_id TEXT NOT NULL, UNIQUE(appuntamento_id, giardiniere_id))',
    []
  );
}

async function ensureAppuntamentoAttivitaTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS appuntamento_attivita (id TEXT PRIMARY KEY, appuntamento_id TEXT NOT NULL, description TEXT NOT NULL)',
    []
  );
}

async function ensureNotificheTable(db: ReturnType<typeof createDbClient>) {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS notifiche (id TEXT PRIMARY KEY, giardiniere_id TEXT NOT NULL, appuntamento_id TEXT NOT NULL, cliente_id TEXT, title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
    []
  );

  const columnsResult = await db.execute("PRAGMA table_info('notifiche')", []);
  const rows = Array.isArray(columnsResult.rows) ? columnsResult.rows : [];
  const hasClienteId = rows.some((row: any) => {
    const colName = row?.name?.toString?.().toLowerCase?.();
    return colName === 'cliente_id';
  });

  if (!hasClienteId) {
    try {
      await db.execute('ALTER TABLE notifiche ADD COLUMN cliente_id TEXT', []);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!message.includes('duplicate column name') && !message.includes('already exists')) {
        throw error;
      }
    }
  }
}

export default async function handler(req: any, res: any) {
  const slug = req.query?.slug;
  const segments = Array.isArray(slug) ? slug : typeof slug === 'string' ? [slug] : [];
  const path = '/' + segments.join('/');
  const method = (req.method || 'GET').toUpperCase();
  const db = createDbClient();

  try {
    if (path === '/login' && method === 'POST') {
      const { role, username, code } = req.body ?? {};
      if (!['admin', 'giardiniere', 'cliente'].includes(role)) {
        return json(res, 400, { success: false, message: 'Ruolo di login non valido.' });
      }
      if (!username || !code) {
        return json(res, 400, { success: false, message: 'Nome e codice sono obbligatori.' });
      }
      if (role === 'admin') {
        if (username === 'Angelo' && code === 'A2026') {
          return json(res, 200, { success: true, role, username });
        }
        return json(res, 401, { success: false, message: 'Credenziali admin errate.' });
      }
      const query =
        role === 'giardiniere'
          ? 'SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) AND codice = ? LIMIT 1'
          : 'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND codice = ? LIMIT 1';
      const result = await db.execute(query, [username.trim(), code.trim()]);
      const rows = Array.isArray(result.rows) ? result.rows : [];
      if (rows.length > 0) {
        const firstRow = rows[0] as any;
        const userId =
          normalizeValue(firstRow?.id) ??
          normalizeValue(firstRow?.ID) ??
          normalizeValue(firstRow?.Id) ??
          normalizeValue(Array.isArray(firstRow) ? firstRow[0] : undefined) ??
          normalizeValue(Object.values(firstRow)[0]);
        return json(res, 200, { success: true, role, username, id: userId });
      }
      return json(res, 401, { success: false, message: 'Credenziali errate.' });
    }

    if (path === '/counts' && method === 'GET') {
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
      return json(res, 200, {
        success: true,
        giardinieriCount: extractCount(giardResult),
        giardinieriActiveCount: extractCount(giardActiveResult),
        giardinieriInactiveCount: extractCount(giardInactiveResult),
        clientiCount: extractCount(clientResult),
        clientiActiveCount: extractCount(activeResult),
        clientiInactiveCount: extractCount(inactiveResult),
      });
    }

    if (path === '/giardinieri') {
      if (method === 'GET') {
        await ensureGiardinieriTable(db);
        const result = await db.execute('SELECT id, username, codice, created_at, attivo FROM giardinieri ORDER BY created_at DESC', []);
        return json(res, 200, { success: true, giardinieri: result.rows || [] });
      }
      if (method === 'POST') {
        const { username, codice, attivo } = req.body ?? {};
        const trimmedUsername = username?.toString().trim();
        const trimmedCodice = codice?.toString().trim();
        const isActive = attivo ? 1 : 0;
        if (!trimmedUsername || !trimmedCodice) {
          return json(res, 400, { success: false, message: 'Username e codice sono obbligatori.' });
        }
        await ensureGiardinieriTable(db);
        const existing = await db.execute('SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) LIMIT 1', [trimmedUsername]);
        if (existing.rows.length > 0) {
          return json(res, 409, { success: false, message: 'Username già presente. Usa un altro username.' });
        }
        await db.execute('INSERT INTO giardinieri (id, username, codice, created_at, attivo) VALUES (?, ?, ?, ?, ?)', [crypto.randomUUID(), trimmedUsername, trimmedCodice, new Date().toISOString(), isActive]);
        return json(res, 200, { success: true });
      }
    }

    if (segments[0] === 'giardinieri' && segments[1] && ['PUT', 'DELETE'].includes(method)) {
      const id = segments[1];
      if (!id) {
        return json(res, 400, { success: false, message: 'Id giardiniere mancante.' });
      }
      await ensureGiardinieriTable(db);
      if (method === 'PUT') {
        const { username, codice, attivo } = req.body ?? {};
        const trimmedUsername = username?.toString().trim();
        const trimmedCodice = codice?.toString().trim();
        const isActive = attivo ? 1 : 0;
        if (!trimmedUsername || !trimmedCodice) {
          return json(res, 400, { success: false, message: 'Username e codice sono obbligatori.' });
        }
        const existing = await db.execute('SELECT id FROM giardinieri WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1', [trimmedUsername, id]);
        if (existing.rows.length > 0) {
          return json(res, 409, { success: false, message: 'Username già presente. Usa un altro username.' });
        }
        await db.execute('UPDATE giardinieri SET username = ?, codice = ?, attivo = ? WHERE id = ?', [trimmedUsername, trimmedCodice, isActive, id]);
        return json(res, 200, { success: true });
      }
      if (method === 'DELETE') {
        await db.execute('DELETE FROM giardinieri WHERE id = ?', [id]);
        return json(res, 200, { success: true });
      }
    }

    if (path === '/clienti') {
      if (method === 'GET') {
        await ensureClientiTable(db);
        const result = await db.execute('SELECT id, nome, indirizzo, telefono, codice, attivo FROM clienti ORDER BY id DESC', []);
        return json(res, 200, { success: true, clienti: result.rows || [] });
      }
      if (method === 'POST') {
        const { nome, indirizzo, telefono, codice, attivo } = req.body ?? {};
        const trimmedNome = nome?.toString().trim();
        const trimmedIndirizzo = indirizzo?.toString().trim();
        const trimmedTelefono = telefono?.toString().trim() ?? '';
        const trimmedCodice = codice?.toString().trim();
        const isActive = attivo ? 1 : 0;
        if (!trimmedNome || !trimmedIndirizzo || !trimmedCodice) {
          return json(res, 400, { success: false, message: 'Nome, indirizzo e codice sono obbligatori.' });
        }
        await ensureClientiTable(db);
        const existingClient = await db.execute('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) LIMIT 1', [trimmedNome]);
        if (existingClient.rows.length > 0) {
          return json(res, 409, { success: false, message: 'Cliente già presente. Usa un altro nome.' });
        }
        await db.execute('INSERT INTO clienti (nome, indirizzo, telefono, codice, attivo) VALUES (?, ?, ?, ?, ?)', [trimmedNome, trimmedIndirizzo, trimmedTelefono, trimmedCodice, isActive]);
        return json(res, 200, { success: true });
      }
    }

    if (segments[0] === 'clienti' && segments[1] && ['PUT', 'DELETE'].includes(method)) {
      const id = segments[1];
      if (!id) {
        return json(res, 400, { success: false, message: 'Id cliente mancante.' });
      }
      await ensureClientiTable(db);
      if (method === 'PUT') {
        const { nome, indirizzo, telefono, codice, attivo } = req.body ?? {};
        const trimmedNome = nome?.toString().trim();
        const trimmedIndirizzo = indirizzo?.toString().trim();
        const trimmedTelefono = telefono?.toString().trim() ?? '';
        const trimmedCodice = codice?.toString().trim();
        const isActive = attivo ? 1 : 0;
        if (!trimmedNome || !trimmedIndirizzo || !trimmedCodice) {
          return json(res, 400, { success: false, message: 'Nome, indirizzo e codice sono obbligatori.' });
        }
        const existing = await db.execute('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND id != ? LIMIT 1', [trimmedNome, id]);
        if (existing.rows.length > 0) {
          return json(res, 409, { success: false, message: 'Cliente già presente. Usa un altro nome.' });
        }
        await db.execute('UPDATE clienti SET nome = ?, indirizzo = ?, telefono = ?, codice = ?, attivo = ? WHERE id = ?', [trimmedNome, trimmedIndirizzo, trimmedTelefono, trimmedCodice, isActive, id]);
        return json(res, 200, { success: true });
      }
      if (method === 'DELETE') {
        await db.execute('DELETE FROM clienti WHERE id = ?', [id]);
        return json(res, 200, { success: true });
      }
    }

    if (path === '/attivita') {
      if (method === 'GET') {
        await ensureAttivitaTable(db);
        const result = await db.execute('SELECT id, description, completed, created_at FROM attivita ORDER BY LOWER(description) ASC', []);
        return json(res, 200, { success: true, attivita: result.rows || [] });
      }
      if (method === 'POST') {
        const { description } = req.body ?? {};
        const trimmedDescription = description?.toString().trim();
        if (!trimmedDescription) {
          return json(res, 400, { success: false, message: 'La descrizione dell\'attività è obbligatoria.' });
        }
        await ensureAttivitaTable(db);
        await db.execute('INSERT INTO attivita (id, description, completed, created_at) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), trimmedDescription, 0, new Date().toISOString()]);
        return json(res, 200, { success: true });
      }
    }

    if (segments[0] === 'attivita' && segments[1] && ['PUT', 'DELETE'].includes(method)) {
      const id = segments[1];
      await ensureAttivitaTable(db);
      if (method === 'PUT') {
        const { description, completed } = req.body ?? {};
        const trimmedDescription = description?.toString().trim();
        const isCompleted = completed ? 1 : 0;
        if (!id || (trimmedDescription === undefined && completed === undefined)) {
          return json(res, 400, { success: false, message: 'Dati attività non validi.' });
        }
        const updates: string[] = [];
        const params: any[] = [];
        if (trimmedDescription !== undefined) {
          updates.push('description = ?');
          params.push(trimmedDescription);
        }
        if (completed !== undefined) {
          updates.push('completed = ?');
          params.push(isCompleted);
        }
        params.push(id);
        await db.execute(`UPDATE attivita SET ${updates.join(', ')} WHERE id = ?`, params);
        return json(res, 200, { success: true });
      }
      if (method === 'DELETE') {
        await db.execute('DELETE FROM attivita WHERE id = ?', [id]);
        return json(res, 200, { success: true });
      }
    }

    if (path === '/appuntamenti') {
      if (method === 'GET') {
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
        return json(res, 200, { success: true, appointments: [...appointmentsMap.values()] });
      }
      if (method === 'POST') {
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
          return json(res, 400, { success: false, message: 'Data, cliente e almeno un giardiniere sono obbligatori.' });
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
        return json(res, 200, { success: true });
      }
    }

    if (path === '/notifiche') {
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
        return json(res, 200, { success: true, notifiche: result.rows || [] });
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
          return json(res, 400, { success: false, message: 'Messaggio è obbligatorio.' });
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
          return json(res, 400, { success: false, message: 'Nessun giardiniere selezionato o attivo.' });
        }
        const createdAt = new Date().toISOString();
        for (const giardiniereId of recipients) {
          await db.execute('INSERT INTO notifiche (id, giardiniere_id, appuntamento_id, cliente_id, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), giardiniereId, '', trimmedClienteId || null, trimmedTitle, trimmedMessage, 0, createdAt]);
        }
        return json(res, 200, { success: true });
      }
    }

    if (segments[0] === 'notifiche' && segments[1] === 'read' && method === 'PUT' && segments.length === 2) {
      return json(res, 404, { success: false, message: 'Id notifica mancante.' });
    }

    if (segments[0] === 'notifiche' && segments[1] && segments[2] === 'read' && method === 'PUT') {
      const id = segments[1];
      if (!id) {
        return json(res, 400, { success: false, message: 'Id notifica mancante.' });
      }
      await ensureNotificheTable(db);
      await db.execute('UPDATE notifiche SET read = 1 WHERE id = ?', [id]);
      return json(res, 200, { success: true });
    }

    if (path === '/hello' && method === 'GET') {
      return json(res, 200, { success: true, message: 'Hello from the single API function.' });
    }

    return json(res, 404, { success: false, message: 'Endpoint non trovato.' });
  } catch (error) {
    console.error('Catch-all API error', path, method, error);
    const message = error instanceof Error ? error.message : 'Errore interno del server.';
    return json(res, 500, { success: false, message });
  }
}
