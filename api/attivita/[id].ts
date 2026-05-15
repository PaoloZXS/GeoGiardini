import { createDbClient, ensureAttivitaTable } from '../../lib/db';

export default async function handler(req: any, res: any) {
  const id = req.query?.id?.toString?.();
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Id attività mancante.' }));
    return;
  }

  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
    return;
  }

  try {
    const db = createDbClient();
    await ensureAttivitaTable(db);

    if (req.method === 'PUT') {
      const { description, completed } = req.body ?? {};
      const trimmedDescription = description?.toString().trim();
      const isCompleted = completed ? 1 : 0;
      if (!id || (trimmedDescription === undefined && completed === undefined)) {
        return res.status(400).json({ success: false, message: 'Dati attività non validi.' });
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
      return res.status(200).json({ success: true });
    }

    await db.execute('DELETE FROM attivita WHERE id = ?', [id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Attivita id API error', error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
