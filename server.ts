import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@libsql/client';

const databaseUrl = 'libsql://geogiardini-paolozxs.aws-eu-west-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwODIzMzgsImlkIjoiMDE5ZGZkOGItZWEwMS03NGI2LTkzNTUtZDgxNjI4YjEzMDlkIiwicmlkIjoiZjFjYTE4ZDktOTMxOS00MmFkLTg4NTEtNDFiODVlMTEzOTNiIn0.ZwsaKrGcqLR_THEJ9OUGCE8pOK8mRs7P8fuOhodrsDwIPrff5UVKA2oR6ePLNxRm0cpcmQmaIS1eSV7T0D16CA';

async function startServer() {
  const db = createClient({
    url: databaseUrl,
    authToken,
  });

  const app = express();
  app.use(cors({ origin: ['http://localhost:4173', 'http://127.0.0.1:4173'] }));
  app.use(bodyParser.json());

  const tableName = 'giardinieri';
  async function ensureGiardinieriTable() {
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
      await db.execute(
        `ALTER TABLE ${tempTable} RENAME TO giardinieri`,
        []
      );
    }
  }

  app.post('/api/giardinieri', async (req, res) => {
    try {
      const { username, codice } = req.body as { username?: string; codice?: string };
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      await ensureGiardinieriTable();

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
    } catch (error) {
      console.error('Saving giardinieri failed', error);
      return res.status(500).json({ success: false, message: 'Errore durante il salvataggio.' });
    }
  });

  app.get('/api/giardinieri', async (req, res) => {
    try {
      await ensureGiardinieriTable();
      const result = await db.execute('SELECT id, username, codice, created_at FROM giardinieri ORDER BY created_at DESC', []);
      return res.json({ success: true, giardinieri: result.rows || [] });
    } catch (error) {
      console.error('Fetching giardinieri failed', error);
      return res.status(500).json({ success: false, giardinieri: [], message: 'Errore caricamento giardinieri.' });
    }
  });

  app.put('/api/giardinieri/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, codice } = req.body as { username?: string; codice?: string };
      const trimmedUsername = username?.toString().trim();
      const trimmedCodice = codice?.toString().trim();

      if (!trimmedUsername || !trimmedCodice) {
        return res.status(400).json({ success: false, message: 'Username e codice sono obbligatori.' });
      }

      await ensureGiardinieriTable();

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
    } catch (error) {
      console.error('Updating giardiniere failed', error);
      return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento.' });
    }
  });

  async function ensureClientiTable() {
    await db.execute(
      'CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY, nome TEXT, indirizzo TEXT, telefono TEXT)',
      []
    );
  }

  app.post('/api/clienti', async (req, res) => {
    try {
      const { nome, indirizzo, telefono } = req.body as {
        nome?: string;
        indirizzo?: string;
        telefono?: string;
      };
      const trimmedNome = nome?.toString().trim();
      const trimmedIndirizzo = indirizzo?.toString().trim();
      const trimmedTelefono = telefono?.toString().trim() ?? '';

      if (!trimmedNome || !trimmedIndirizzo) {
        return res.status(400).json({ success: false, message: 'Nome e indirizzo sono obbligatori.' });
      }

      await ensureClientiTable();

      const existingClient = await db.execute(
        'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) LIMIT 1',
        [trimmedNome]
      );

      if (existingClient.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Cliente già presente. Usa un altro nome.' });
      }

      await db.execute(
        'INSERT INTO clienti (nome, indirizzo, telefono) VALUES (?, ?, ?)',
        [trimmedNome, trimmedIndirizzo, trimmedTelefono]
      );

      return res.json({ success: true });
    } catch (error) {
      console.error('Saving clienti failed', error);
      return res.status(500).json({ success: false, message: 'Errore durante il salvataggio cliente.' });
    }
  });

  app.get('/api/clienti', async (req, res) => {
    try {
      await ensureClientiTable();
      const result = await db.execute('SELECT id, nome, indirizzo, telefono FROM clienti ORDER BY id DESC', []);
      return res.json({ success: true, clienti: result.rows || [] });
    } catch (error) {
      console.error('Fetching clienti failed', error);
      return res.status(500).json({ success: false, clienti: [], message: 'Errore caricamento clienti.' });
    }
  });

  app.put('/api/clienti/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, indirizzo, telefono } = req.body as { nome?: string; indirizzo?: string; telefono?: string };
      const trimmedNome = nome?.toString().trim();
      const trimmedIndirizzo = indirizzo?.toString().trim();
      const trimmedTelefono = telefono?.toString().trim() ?? '';

      if (!trimmedNome || !trimmedIndirizzo) {
        return res.status(400).json({ success: false, message: 'Nome e indirizzo sono obbligatori.' });
      }

      await ensureClientiTable();

      const existing = await db.execute(
        'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND id != ? LIMIT 1',
        [trimmedNome, id]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Cliente già presente. Usa un altro nome.' });
      }

      await db.execute(
        'UPDATE clienti SET nome = ?, indirizzo = ?, telefono = ? WHERE id = ?',
        [trimmedNome, trimmedIndirizzo, trimmedTelefono, id]
      );

      return res.json({ success: true });
    } catch (error) {
      console.error('Updating cliente failed', error);
      return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento cliente.' });
    }
  });

  const extractCount = (result: any) => {
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
  };

  app.get('/api/giardinieri/count', async (req, res) => {
    try {
      await ensureGiardinieriTable();
      const result = await db.execute('SELECT COUNT(*) FROM giardinieri', []);
      const count = extractCount(result);
      return res.json({ success: true, count });
    } catch (error) {
      console.error('Counting giardinieri failed', error);
      return res.status(500).json({ success: false, count: 0, message: 'Errore conteggio giardinieri.' });
    }
  });

  app.get('/api/clienti/count', async (req, res) => {
    try {
      await ensureClientiTable();
      const result = await db.execute('SELECT COUNT(*) FROM clienti', []);
      const count = extractCount(result);
      return res.json({ success: true, count });
    } catch (error) {
      console.error('Counting clienti failed', error);
      return res.status(500).json({ success: false, count: 0, message: 'Errore conteggio clienti.' });
    }
  });

  app.get('/api/counts', async (req, res) => {
    try {
      await ensureGiardinieriTable();
      await ensureClientiTable();
      const [giardResult, clientResult] = await Promise.all([
        db.execute('SELECT COUNT(*) FROM giardinieri', []),
        db.execute('SELECT COUNT(*) FROM clienti', []),
      ]);
      return res.json({
        success: true,
        giardinieriCount: extractCount(giardResult),
        clientiCount: extractCount(clientResult),
      });
    } catch (error) {
      console.error('Counting totals failed', error);
      return res.status(500).json({
        success: false,
        giardinieriCount: 0,
        clientiCount: 0,
        message: 'Errore conteggio totali.',
      });
    }
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Turso proxy API server listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
