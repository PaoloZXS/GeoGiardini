import { createClient } from '@libsql/client';

const db = createClient({
  url: 'libsql://geogiardini-paolozxs.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwODIzMzgsImlkIjoiMDE5ZGZkOGItZWEwMS03NGI2LTkzNTUtZDgxNjI4YjEzMDlkIiwicmlkIjoiZjFjYTE4ZDktOTMxOS00MmFkLTg4NTEtNDFiODVlMTEzOTNiIn0.ZwsaKrGcqLR_THEJ9OUGCE8pOK8mRs7P8fuOhodrsDwIPrff5UVKA2oR6ePLNxRm0cpcmQmaIS1eSV7T0D16CA',
});

const main = async () => {
  const info = await db.execute("PRAGMA table_info('clienti')", []);
  const columns = Array.isArray(info.rows)
    ? info.rows.map((row) => row[1] || row.name)
    : [];
  console.log('Current clienti columns:', columns);
  if (!columns.includes('codice')) {
    console.log('Adding codice column to clienti...');
    await db.execute('ALTER TABLE clienti ADD COLUMN codice TEXT NOT NULL DEFAULT ""', []);
    console.log('Column added successfully.');
  } else {
    console.log('Column codice already exists.');
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});