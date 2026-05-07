const TURSO_DATABASE_URL =
  "libsql://geogiardini-paolozxs.aws-eu-west-1.turso.io";
const TURSO_AUTH_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwODIzMzgsImlkIjoiMDE5ZGZkOGItZWEwMS03NGI2LTkzNTUtZDgxNjI4YjEzMDlkIiwicmlkIjoiZjFjYTE4ZDktOTMxOS00MmFkLTg4NTEtNDFiODVlMTEzOTNiIn0.ZwsaKrGcqLR_THEJ9OUGCE8pOK8mRs7P8fuOhodrsDwIPrff5UVKA2oR6ePLNxRm0cpcmQmaIS1eSV7T0D16CA";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, code } = req.body;

  if (!username || !code) {
    return res.status(400).json({ error: "Missing username or code" });
  }

  if (username === "Angelo" && code === "A2026") {
    return res.status(200).json({ success: true, role: "admin", username });
  }

  try {
    const response = await fetch(`${TURSO_DATABASE_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TURSO_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        statements: [
          {
            sql: "SELECT * FROM giardinieri WHERE username = ? AND codice = ?",
            parameters: [username, code]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error("Database query failed");
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
