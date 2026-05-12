const TURSO_DATABASE_URL =
  "libsql://geogiardini-paolozxs.aws-eu-west-1.turso.io";
const TURSO_AUTH_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwODIzMzgsImlkIjoiMDE5ZGZkOGItZWEwMS03NGI2LTkzNTUtZDgxNjI4YjEzMDlkIiwicmlkIjoiZjFjYTE4ZDktOTMxOS00MmFkLTg4NTEtNDFiODVlMTEzOTNiIn0.ZwsaKrGcqLR_THEJ9OUGCE8pOK8mRs7P8fuOhodrsDwIPrff5UVKA2oR6ePLNxRm0cpcmQmaIS1eSV7T0D16CA";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { role, username, code } = req.body ?? {};

  if (!['admin', 'giardiniere', 'cliente'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Ruolo di login non valido.' });
  }

  if (!username || !code) {
    return res.status(400).json({ success: false, message: 'Nome e codice sono obbligatori.' });
  }

  if (role === 'admin') {
    if (username === 'Angelo' && code === 'A2026') {
      return res.status(200).json({ success: true, role: 'admin', username });
    }
    return res.status(401).json({ success: false, message: 'Credenziali admin errate.' });
  }

  try {
    const sql =
      role === 'giardiniere'
        ? 'SELECT id FROM giardinieri WHERE username = ? AND codice = ? LIMIT 1'
        : 'SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND codice = ? LIMIT 1';
    const parameters = [username, code];

    const response = await fetch(`${TURSO_DATABASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TURSO_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        statements: [
          {
            sql,
            parameters,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Database query failed');
    }

    const data = await response.json();
    const results = data.results?.[0]?.rows ?? [];

    if (Array.isArray(results) && results.length > 0) {
      return res.status(200).json({ success: true, role, username });
    }

    return res.status(401).json({ success: false, message: 'Credenziali errate.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}
